#!/usr/bin/env python3
"""Audit-only real HTTP checks. Requires the ghostpay-release-audit Compose project and /tmp/ghostpay-release-audit.env."""
import json,urllib.request,urllib.error,subprocess,uuid,time,base64,hmac,hashlib
from pathlib import Path
base='http://127.0.0.1:3000'
def http(path,data=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers=headers)
 try:
  with urllib.request.urlopen(req,timeout=5) as res:return res.status,json.load(res)
 except urllib.error.HTTPError as res:return res.code,json.load(res)
credentials={'email':'disabled-'+str(uuid.uuid4())+'@example.com','password':'release-audit-password'}
assert http('/api/v1/auth/register',credentials)[0]==201
status,login=http('/api/v1/auth/login',credentials);assert status==200;token=login['accessToken']
status,merchant=http('/api/v1/merchants',{'name':'Disabled HTTP audit'},token);assert status==201
status,terminal=http('/api/v1/terminals',{'name':'Disabled counter','merchantId':merchant['id']},token);assert status==201
compose=['docker','compose','--env-file','/tmp/ghostpay-release-audit.env','-p','ghostpay-release-audit']
terminal_id=str(uuid.UUID(terminal['id']))
subprocess.run(compose+['exec','-T','db','psql','-U','ghostpay','-d','ghostpay','-c',f"UPDATE terminals SET status='DISABLED' WHERE id='{terminal_id}'"],check=True,stdout=subprocess.DEVNULL)
batch={'batchId':str(uuid.uuid4()),'payments':[{'localPaymentId':str(uuid.uuid4()),'purchaseReference':'disabled-http','amountMinor':100,'currency':'MYR'}]}
status,result=http('/api/v1/terminals/'+terminal_id+'/sync',batch,token)
assert status==409 and result['code']=='TERMINAL_DISABLED',(status,result)
assert http('/api/v1/payments?terminalId='+terminal_id,token=token)==(200,[])
values=dict(line.split('=',1) for line in Path('/tmp/ghostpay-release-audit.env').read_text().splitlines())
enc=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
subject=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['sub']
parts=enc({'alg':'HS256','typ':'JWT'})+b'.'+enc({'sub':subject,'iss':'ghostpay','iat':int(time.time())-3600,'exp':int(time.time())-120})
signature=base64.urlsafe_b64encode(hmac.new(values['JWT_SECRET'].encode(),parts,hashlib.sha256).digest()).rstrip(b'=')
status,result=http('/api/v1/account/me',token=(parts+b'.'+signature).decode())
assert status==401 and result['code']=='UNAUTHORIZED',(status,result)
print('Additional real HTTP checks passed: disabled terminal 409 with no payment writes; correctly signed expired JWT 401.')
Path('/tmp/ghostpay-http-evidence.json').write_text(json.dumps({'disabledTerminalStatus':409,'paymentRows':0,'expiredJwtStatus':401}))
