"""AI settings on an own server (port 8806) with a temporary settings file; the real settings.json is never touched.
Checks that a saved key is never sent back, the file is private, and model and key changes work. One call goes to DeepSeek
with a made-up key, which it refuses; that costs nothing."""
import json,os,shutil,stat,subprocess,sys,tempfile,time,urllib.request,urllib.error
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'); PORT='8806'; B='http://localhost:'+PORT
tmp=tempfile.mkdtemp(prefix='duo-settings-'); os.makedirs(os.path.join(tmp,'saves')); SF=os.path.join(tmp,'settings.json')
env={**os.environ,'DUO_PORT':PORT,'DUO_SAVES':os.path.join(tmp,'saves'),'DUO_SETTINGS':SF,'DUO_AI_FIXTURE':os.path.join(ROOT,'tools','fixtures','orseg_interpreter.json')}
srv=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def J(u,b=None):
    r=urllib.request.Request(B+u,json.dumps(b).encode() if b is not None else None,method='POST' if b is not None else 'GET')
    try: return json.load(urllib.request.urlopen(r))
    except urllib.error.HTTPError as e: return {'_code':e.code,**json.load(e)}
for _ in range(50):
    try: J('/api/runs'); break
    except Exception: time.sleep(.1)
bad=0
def check(n,got,want):
    global bad; ok=got==want; bad+=not ok; print(('ok  ' if ok else 'FAIL'),n,'' if ok else json.dumps(got))
FAKE='sk-test-made-up-0000-abcd'
try:
    s=J('/api/settings'); check('this machine may edit',s['canEdit'],True)
    r=J('/api/settings',{'apiKey':FAKE}); check('own key saved',[r.get('keySource'),r.get('keyHint')],['settings','abcd'])
    check('key never sent back',FAKE in json.dumps(J('/api/settings'))+json.dumps(r),False)
    check('settings file readable only by the user',oct(stat.S_IMODE(os.stat(SF).st_mode)),'0o600')
    check('model saved',J('/api/settings',{'model':'deepseek-test'}).get('model'),'deepseek-test')
    check('bad model name refused',J('/api/settings',{'model':'x y;rm'}).get('_code'),400)
    c=J('/api/settings/check',{}); check('DeepSeek refuses the made-up key',[c.get('_code'),'error' in c],[400,True])
    r=J('/api/settings',{'clearKey':True}); check('own key cleared',r.get('keySource')!='settings',True)
    def code(u):
        try: return urllib.request.urlopen(B+u).status
        except urllib.error.HTTPError as e: return e.code
    check('settings file never served',[code('/settings.json'),code('/public/settings.json'),code('/public/..%2Fsettings.json')],[404,404,404])
finally:
    srv.terminate(); srv.wait(); shutil.rmtree(tmp,ignore_errors=True)
print(f'{bad} failed' if bad else 'all passed'); sys.exit(1 if bad else 0)
