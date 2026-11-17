"""Games in two eras on an own server (port 8808), temporary save folder and the fixture game tools/fixtures/games/eras; no model call.
Two threads from the start, also alone; alone each era's page links to the other; a shared scripted scene shows each player their own things; a scripted entry's `if` is tested after the message ran."""
import json,os,shutil,subprocess,tempfile,time,urllib.request
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'); PORT='8808'; B='http://localhost:'+PORT
tmp=tempfile.mkdtemp(prefix='duo-eras-'); os.makedirs(os.path.join(tmp,'saves'))
env={**os.environ,'DUO_PORT':PORT,'DUO_SAVES':os.path.join(tmp,'saves'),'DUO_GAMES':os.path.join(ROOT,'tools','fixtures','games'),'DUO_ALLOW_DIRECT':'1','DUO_AI_FIXTURE':os.path.join(tmp,'none.json')}
srv=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def J(u,b=None):
    r=urllib.request.Request(B+u,json.dumps(b).encode() if b is not None else None,method='POST' if b is not None else 'GET'); return json.load(urllib.request.urlopen(r))
for _ in range(50):
    try: J('/api/runs'); break
    except Exception: time.sleep(.1)
bad=0
def check(n,got,want):
    global bad; ok=got==want; bad+=not ok; print(('ok  ' if ok else 'FAIL'),n,'' if ok else json.dumps(got,ensure_ascii=False))
def st(t):
    for _ in range(100):
        s=J(f'/api/p/{t}/state')
        if not s['busy']: return s
        time.sleep(.1)
    return s
try:
    check('game lists its eras',[g['eras'] for g in J('/api/games') if g['id']=='eras'],[['1974','Now']])
    for solo in (False,True):
        tag='alone: ' if solo else 'two: '
        A,Bt=J('/api/runs',{'game':'eras','solo':solo,'names':['Anna','Bea']})['tokens']
        a,b=st(A),st(Bt)
        check(tag+'apart from the start',[a['apart'],b['apart']],[True,True])
        check(tag+'eras sent to the page',a['game']['eras'],['1974','Now'])
        check(tag+'switch link only alone',[a['switchTo'],b['switchTo']],[Bt,A] if solo else [None,None])
        J(f'/api/p/{A}/message',{'text':'(GAME: CAPSULE jar cellar)'}); a,b=st(A),st(Bt)
        la,lb=a['messages'][-1]['text'],b['messages'][-1]['text']
        check(tag+'shared scene reaches both',['SCENE' in la,'SCENE' in lb],[True,True])
        check(tag+'world read the message',['jar@cellar' in la,'jar@cellar' in lb],[True,True])
        check(tag+'each sees own things',[('[i:key|' in la,'[i:torch|' in la),('[i:key|' in lb,'[i:torch|' in lb)],[(True,False),(False,True)])
        # scripted `if`: tested after the message ran (it sets the var it reads); first entry that holds wins; none holds: an ordinary reply
        for lvl,want in (('mid','MID END'),('high','LOUD END'),('low',None)):
            J(f'/api/p/{A}/message',{'text':f'(GAME: ALARM {lvl})'}); a,b=st(A),st(Bt); la,lb=a['messages'][-1]['text'],b['messages'][-1]['text']
            got=[x for x in ('MID END','LOUD END') if x in la]
            check(tag+f'scripted if, alarm {lvl}',got,[want] if want else [])
finally:
    srv.terminate(); err=srv.stderr.read().decode(); srv.wait(); shutil.rmtree(tmp,ignore_errors=True)
    if bad and err: print(err[-1500:])
print(f'{bad} failed' if bad else 'all passed'); raise SystemExit(1 if bad else 0)
