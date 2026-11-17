"""Two players together and apart, on an own server (port 8805) and temporary save folder, no model call.
Together they share one thread and wait for each other; apart each gets their own replies at once, never sees the other's,
and each thread's narrator prompt only grows at the end (prompt cache). Prints no game text. --record calls the real interpreter once for a sentence missing from the fixture file."""
import json,os,shutil,subprocess,sys,tempfile,time,urllib.request
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'); PORT='8805'; B='http://localhost:'+PORT
tmp=tempfile.mkdtemp(prefix='duo-threads-'); trace=os.path.join(tmp,'trace.jsonl'); os.makedirs(os.path.join(tmp,'saves'))
env={**os.environ,**({'DUO_AI_RECORD':'1'} if '--record' in sys.argv else {}),'DUO_PORT':PORT,'DUO_SAVES':os.path.join(tmp,'saves'),'DUO_ALLOW_DIRECT':'1','DUO_AI_FIXTURE':os.path.join(ROOT,'tools','fixtures','orseg_interpreter.json'),'DUO_AI_TRACE':trace}
srv=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def J(u,b=None):
    r=urllib.request.Request(B+u,json.dumps(b).encode() if b is not None else None,method='POST' if b is not None else 'GET'); return json.load(urllib.request.urlopen(r))
for _ in range(50):
    try: J('/api/runs'); break
    except Exception: time.sleep(.1)
bad=0
def check(n,got,want):
    global bad; ok=got==want; bad+=not ok; print(('ok  ' if ok else 'FAIL'),n,json.dumps(got,ensure_ascii=False) if not ok else '')
def st(t): return J(f'/api/p/{t}/state')
def idle(t):
    for _ in range(100):
        s=st(t)
        if not s['busy']: return s
        time.sleep(.1)
    return s
replies=lambda s:[m for m in s['messages'] if m['role']=='assistant']
calls=lambda:[json.loads(l) for l in open(trace)] if os.path.exists(trace) else []
def prefix(a,b): return b[:len(a)-1]==a[:-1]   # all but the last (per-turn) system message
try:
    r=J('/api/runs',{'game':'orseg','solo':False,'names':['Jancsi','Juliska']}); A,Bt=r['tokens']
    # together: A waits for B
    J(f'/api/p/{A}/say',{'text':'Megölelem Juliskát, kicsit félek.'}); s=idle(A)
    check('together: no reply before the partner moves',len(replies(s)),1)
    J(f'/api/p/{Bt}/say',{'text':''}); s=idle(A)
    check('together: reply after both moved, both see it',[len(replies(s)),len(replies(st(Bt)))],[2,2])
    J(f'/api/p/{A}/message',{'text':'(GAME: SOLVED, Lépcsőajtó)'}); idle(A)
    J(f'/api/p/{A}/say',{'text':'Felmegyek a csigalépcsőn.'}); J(f'/api/p/{Bt}/say',{'text':''}); s=idle(A)
    check('apart after A walks up',s['apart'],True)
    # apart: no waiting, private replies
    nA,nB=len(st(A)['messages']),len(st(Bt)['messages'])
    J(f'/api/p/{Bt}/message',{'text':'(OOC: unseen)'})
    J(f'/api/p/{A}/say',{'text':'Mi az a Fresnel-lencse?'}); idle(A)
    sa,sb=st(A),st(Bt)
    check('apart: A got a reply without B moving',sa['messages'][-1]['role'],'assistant')
    check('apart: B got own reply',sb['messages'][-1]['role'],'assistant')
    check('apart: A sees only own new messages',len(sa['messages'])-nA,2)
    check('apart: B sees only own new messages',len(sb['messages'])-nB,2)
    check('apart: A never sees B\'s thread',any(m.get('to')==[1] for m in sa['messages']),False)
    check('apart: B never sees A\'s thread',any(m.get('to')==[0] for m in sb['messages']),False)
    check('apart: pass is ignored',(J(f'/api/p/{A}/say',{'text':''}),len(idle(A)['messages']))[1],len(sa['messages']))
    # A comes back: B is told, together again
    J(f'/api/p/{A}/say',{'text':'Lemegyek a lakószobába.'}); s=idle(A); sb=st(Bt)
    check('together again',s['apart'],False)
    check('B told that A arrived',[m.get('kind') for m in sb['messages']][-1],'notice')
    J(f'/api/p/{A}/say',{'text':'Kiáltok: van itt valaki?'}); s=idle(A)
    check('together again: A waits for B',s['messages'][-1]['role'],'user')
    J(f'/api/p/{Bt}/say',{'text':''}); idle(A)
    C=calls(); check('three narrator calls (joint, A alone, joint)',len(C),3)
    if len(C)==3:
        j1,a1,j2=C; txt=lambda c:json.dumps(c,ensure_ascii=False)
        check('same fixed prompt start in every thread',len({json.dumps(c[0]) for c in C}),1)
        check('joint thread only grows (cache)',prefix(j1,j2),True)
        check('A\'s thread continues the joint one (cache)',prefix(j1,a1),True)
        check('joint thread has none of A\'s private turn','Fresnel' in txt(j2),False)
        privB={m['text'] for m in st(Bt)['messages'] if m.get('to')==[1] and m['role']=='assistant'}
        check('B has a private reply to compare',len(privB)>0,True)
        check('A\'s narrator never saw B\'s private reply',any(m['content'] in privB for m in a1),False)
    # restart keeps who saw what
    srv.terminate(); srv.wait(); srv=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(50):
        try: J('/api/runs'); break
        except Exception: time.sleep(.1)
    check('after restart B still cannot see A\'s thread',any(m.get('to')==[0] for m in st(Bt)['messages']),False)
finally:
    srv.terminate(); srv.wait(); shutil.rmtree(tmp,ignore_errors=True)
print(f'{bad} failed' if bad else 'all passed'); sys.exit(1 if bad else 0)
