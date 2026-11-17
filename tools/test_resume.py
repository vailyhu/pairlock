"""Restart test on an own server, port (8804) and temporary save folder: state and notes survive a restart, and a reply cut off by a restart is made again.
No model call: interpreter answers come from tools/fixtures/orseg_interpreter.json. Never touches the user's servers or saves."""
import json,os,shutil,subprocess,sys,tempfile,time,urllib.request
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'); PORT='8804'; B='http://localhost:'+PORT
saves=tempfile.mkdtemp(prefix='duo-resume-'); env={**os.environ,'DUO_PORT':PORT,'DUO_SAVES':saves,'DUO_AI_FIXTURE':os.path.join(ROOT,'tools','fixtures','orseg_interpreter.json')}
srv=None
def J(u,b=None):
    r=urllib.request.Request(B+u,json.dumps(b).encode() if b is not None else None,method='POST' if b is not None else 'GET'); return json.load(urllib.request.urlopen(r))
def start():
    global srv
    srv=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(50):
        try: J('/api/runs'); return
        except Exception: time.sleep(.1)
def stop(): srv.terminate(); srv.wait()
def settle(A,cond):
    for _ in range(60):
        s=J(f'/api/p/{A}/state')
        if not s['busy'] and cond(s): return s
        time.sleep(.3)
    return s
bad=0
def check(n,got,want):
    global bad; ok=got==want; bad+=not ok; print(('ok  ' if ok else 'FAIL'),n,json.dumps(got,ensure_ascii=False))
try:
    start(); r=J('/api/runs',{'game':'orseg','solo':True}); A=r['tokens'][0]
    J(f'/api/p/{A}/say',{'text':'Körülnézek.'}); s=settle(A,lambda s:len(s['messages'])>=3); n=len(s['messages'])
    J(f'/api/p/{A}/notes',{'mine':'test note'}); stop(); start()
    s=J(f'/api/p/{A}/state'); check('messages kept after restart',len(s['messages']),n); check('note kept',s['notes']['mine'],'test note')
    J(f'/api/p/{A}/say',{'text':'Megnézem a fogast.'}); stop(); start()
    s=settle(A,lambda s:s['messages'][-1]['role']=='assistant'); check('cut-off reply made again',[s['messages'][-1]['role'],len(s['messages'])>n],['assistant',True])
finally:
    if srv: stop()
    shutil.rmtree(saves,ignore_errors=True)
print(f'{bad} failed' if bad else 'all passed'); sys.exit(1 if bad else 0)
