import os
import json
import urllib.request

def main(event, context):
 # Debug: print event structure
 print("Event:", str(event)[:500])
 
 user_message = None
 mode = 'heal'
 
 # HTTP trigger: check event structure
 if isinstance(event, dict):
 body = event.get('body') or event.get('data') or event
 if isinstance(body, str):
 try:
 body = json.loads(body)
 except:
 pass
 if isinstance(body, dict):
 user_message = body.get('userMessage', '')
 mode = body.get('mode', 'heal')
 
 if not user_message:
 user_message = event.get('userMessage', '')
 mode = event.get('mode', 'heal')
 
 if not user_message:
 return {'success': False, 'error': 'no message', 'debug': str(event)[:500]}
 
 api_key = os.environ.get('SILICON_API_KEY')
 model = os.environ.get('SILICON_MODEL', 'Pro/deepseek-ai/DeepSeek-V3.2')
 
 if not api_key:
 return {'success': False, 'error': 'no api key'}
 
 system_prompt = 'You are a warm emotional companion.' if mode != 'consult' else 'You are a professional psychological counselor.'
 
 data = json.dumps({
 'model': model,
 'messages': [
 {'role': 'system', 'content': system_prompt},
 {'role': 'user', 'content': user_message}
 ],
 'temperature': 0.7,
 'max_tokens': 500
 }).encode('utf-8')
 
 req = urllib.request.Request(
 'https://api.siliconflow.cn/v1/chat/completions',
 data=data,
 headers={
 'Content-Type': 'application/json',
 'Authorization': f'Bearer {api_key}'
 }
 )
 
 try:
 with urllib.request.urlopen(req, timeout=30) as response:
 result = json.loads(response.read().decode('utf-8'))
 text = result.get('choices', [{}])[0].get('message', {}).get('content', '')
 return {'success': True, 'text': text}
 except Exception as e:
 return {'success': False, 'error': str(e)}
