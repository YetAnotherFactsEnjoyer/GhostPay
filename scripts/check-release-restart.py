#!/usr/bin/env python3
"""Restart only the isolated ghostpay-release-audit project and compare persisted row counts. Never run during browser tests."""
import subprocess,json,time,urllib.request,urllib.error
from pathlib import Path
compose=['docker','compose','--env-file','/tmp/ghostpay-release-audit.env','-p','ghostpay-release-audit']
def sql(query):
 return subprocess.check_output(compose+['exec','-T','db','psql','-U','ghostpay','-d','ghostpay','-Atc',query],text=True).strip()
query="SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM merchants),(SELECT count(*) FROM terminals),(SELECT count(*) FROM payments),(SELECT count(*) FROM sync_batches),(SELECT count(*) FROM sync_events)"
before=sql(query)
Path('/tmp/ghostpay-restart-before.json').write_text(json.dumps({'counts':before}))
email=sql("SELECT email FROM users WHERE email LIKE 'audit-%' ORDER BY created_at LIMIT 1")
subprocess.run(compose+['restart'],check=True)
for attempt in range(40):
 try:
  req=urllib.request.Request('http://127.0.0.1:3000/api/v1/auth/login', data=json.dumps({'email':email,'password':'release-audit-password'}).encode(), headers={'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=3) as r:
   login=json.load(r)
   assert r.status==200 and login.get('accessToken')
  break
 except (OSError,urllib.error.URLError,AssertionError): time.sleep(1)
else: raise AssertionError('Stack did not recover after restart')
after=sql(query)
assert before==after,(before,after)
print('Restart verified: real HTTP login 200; counts unchanged (users|merchants|terminals|payments|batches|events):',after)
Path('/tmp/ghostpay-restart-evidence.json').write_text(json.dumps({'before':before,'after':after,'loginStatus':200}))
