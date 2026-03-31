import os
import json
import urllib.request

def main(event, context):
    try:
        # 安全解析请求体
        data = {}
        if 'body' in event:
            body = event['body']
            if isinstance(body, str):
                try:
                    body = json.loads(body)
                except:
                    pass
            if isinstance(body, dict):
                data = body
        else:
            data = event

        # 提取参数
        prompt = data.get('prompt')  # 前端传入【已构建好的最优完整Prompt】
        user_message = data.get('userMessage')  # 兼容备用
        summary = data.get('summary', '')
        recent_messages = data.get('recentMessages', [])

        # 优先使用前端构建的最优Prompt
        if not prompt and not user_message:
            return {'success': False, 'error': '缺少 prompt 或 userMessage'}

        # 环境变量
        api_key = os.environ.get('SILICON_API_KEY')
        model = os.environ.get('SILICON_MODEL', 'Pro/deepseek-ai/DeepSeek-R1')

        if not api_key:
            return {'success': False, 'error': '未配置 SILICON_API_KEY'}

        # 构建AI消息（优先使用最优Prompt）
        messages = []

        if prompt:
            # 【最优模式：使用前端传入的个性化Prompt】
            messages.append({'role': 'system', 'content': prompt})
        else:
            # 备用模式
            messages.append({
                'role': 'system',
                'content': '你是心芽，温柔真诚的朋友。只倾听、只共情、不给方法、不说教。每次最多2句话。'
            })
            if summary:
                messages.append({'role': 'system', 'content': f'【用户过往】\n{summary}'})
            for msg in recent_messages:
                if msg.get('role') and msg.get('content'):
                    messages.append({'role': msg['role'], 'content': msg['content']})
            messages.append({'role': 'user', 'content': user_message})

        print(f"Messages count: {len(messages)}")
        for i, m in enumerate(messages):
            content = m['content'] if isinstance(m['content'], str) else str(m['content'])
            print(f"  [{i}] {m['role']}: {content[:80]}...")

        # 调用硅基流动 API
        req_data = {
            'model': model,
            'messages': messages,
            'temperature': 0.7,
            'max_tokens': 400,
            'top_p': 0.9,
            'frequency_penalty': 0.1,
        }
        
        data_bytes = json.dumps(req_data).encode('utf-8')
        
        req = urllib.request.Request(
            'https://api.siliconflow.cn/v1/chat/completions',
            data=data_bytes,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
        )
        
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
            reply = (result.get('choices', [{}])[0].get('message', {}).get('content') or '').strip()
            
            if not reply:
                reply = '我在听，你慢慢说。'
            
            print(f"AI response: {reply[:100]}...")
            return {'success': True, 'text': reply}
            
    except Exception as err:
        print(f'【云函数报错】{str(err)}')
        return {
            'success': False,
            'error': '服务异常',
            'detail': str(err)
        }