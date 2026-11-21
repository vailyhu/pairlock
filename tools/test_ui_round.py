"""Waiting toggle, "look around" button, click on a highlighted name and the room picture on re-entering, on an own server
(port 8809) and temporary save folder, no model call. Prints no game text."""
import json,os,re,shutil,subprocess,sys,tempfile,time,urllib.request,urllib.error
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'); PORT='8809'; B='http://localhost:'+PORT
tmp=tempfile.mkdtemp(prefix='duo-ui-'); os.makedirs(os.path.join(tmp,'saves'))
env={**os.environ,'DUO_PORT':PORT,'DUO_SAVES':os.path.join(tmp,'saves'),'DUO_ALLOW_DIRECT':'1','DUO_AI_FIXTURE':os.path.join(ROOT,'tools','fixtures','orseg_interpreter.json')}
srv=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
L=json.load(open(os.path.join(ROOT,'locales','hu.json')))['engine']
def J(u,b=None):
    r=urllib.request.Request(B+u,json.dumps(b).encode() if b is not None else None,method='POST' if b is not None else 'GET')
    try: return json.load(urllib.request.urlopen(r))
    except urllib.error.HTTPError as e: return {'status':e.code,**json.load(e)}
for _ in range(50):
    try: J('/api/runs'); break
    except Exception: time.sleep(.1)
bad=0
def check(n,got,want):
    global bad; ok=got==want; bad+=not ok; print(('ok  ' if ok else 'FAIL'),n,json.dumps(got,ensure_ascii=False) if not ok else '')
def st(t): return J(f'/api/p/{t}/state')
def idle(t):
    time.sleep(.15)
    for _ in range(100):
        s=st(t)
        if not s['busy']: return s
        time.sleep(.1)
    return s
replies=lambda s:[m for m in s['messages'] if m['role']=='assistant']
try:
    r=J('/api/runs',{'game':'orseg','solo':False,'names':['Jancsi','Juliska']}); A,Bt=r['tokens']
    check('waiting is on by default',st(A)['wait'],True)
    # "look around" button: a varying sentence in the player's name, no interpreter, a normal move of the round
    J(f'/api/p/{A}/look',{}); s=idle(A); m=s['messages'][-1]
    check('look around: the sentence comes from the locale list',m['text'].split(': ',1)[1] in L['lookAround'],True)
    check('look around: direct action',m.get('direct'),{'type':'look_around'})
    check('look around: waits for the partner like a typed message',len(replies(s)),1)
    J(f'/api/p/{Bt}/say',{'text':''}); s=idle(A); last=replies(s)[-1]['text']
    check('look around: reply after both moved',len(replies(s)),2)
    hl=re.findall(r'\[\[([^|\]]+)\|([^\]]+)\]\]',last)
    check('room text has highlighted names',len(hl)>0,True)
    # waiting off: any player's message gets its reply at once, in the shared thread
    J(f'/api/p/{Bt}/wait',{'on':False}); s=st(A)
    check('waiting switched off, saved on the run',[s['wait'],s['waitBy']],[False,1])
    n=len(replies(s)); J(f'/api/p/{A}/say',{'text':'Megölelem Juliskát, kicsit félek.'}); s=idle(A)
    check('waiting off: reply without the partner',len(replies(s)),n+1)
    check('waiting off: the reply is in the shared thread',[replies(s)[-1].get('to'),len(replies(st(Bt)))],[None,n+1])
    # click on a highlighted name: look at that thing, no interpreter
    if hl:
        word,iid=hl[0]; J(f'/api/p/{A}/look',{'id':iid}); s=idle(A); m=[x for x in s['messages'] if x['role']=='user'][-1]
        check('click: direct look at the item',m.get('direct'),{'type':'look','target':iid})
        check('click: reply at once (waiting off)',len(replies(s)),n+2)
    check('click on a thing not here is refused',J(f'/api/p/{A}/look',{'id':'nincs_ilyen_targy'}).get('status'),400)
    # waiting on again: a message waits; switching it off answers it at once
    J(f'/api/p/{A}/wait',{'on':True}); n=len(replies(st(A)))
    J(f'/api/p/{A}/say',{'text':'Kiáltok: van itt valaki?'}); s=idle(A)
    check('waiting on again: A waits for B',len(replies(s)),n)
    J(f'/api/p/{Bt}/wait',{'on':False}); s=idle(A)
    check('switching waiting off answers the waiting message',len(replies(s)),n+1)
    # room picture: walking back into a visited room turns the walker's image pane to it
    J(f'/api/p/{A}/message',{'text':'(GAME: SOLVED, Lépcsőajtó)'}); idle(A)
    J(f'/api/p/{A}/say',{'text':'Felmegyek a csigalépcsőn.'}); idle(A)
    J(f'/api/p/{A}/say',{'text':'Lemegyek a lakószobába.'}); idle(A)
    J(f'/api/p/{A}/say',{'text':'Felmegyek a csigalépcsőn.'}); s=idle(A)
    check('re-entering a visited room: view marker for the walker',bool(re.search(r'\[view:0:[a-z_0-9]+\]',replies(s)[-1]['text'])),True)
    srv.terminate(); srv.wait(); srv=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(50):
        try: J('/api/runs'); break
        except Exception: time.sleep(.1)
    check('waiting setting survives a restart',st(A)['wait'],False)
finally:
    srv.terminate(); srv.wait(); shutil.rmtree(tmp,ignore_errors=True)
print(f'{bad} failed' if bad else 'all passed'); sys.exit(1 if bad else 0)
