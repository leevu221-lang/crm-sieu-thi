import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Handle CORS preflight options
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: 'Method Not Allowed' 
    };
  }

  try {
    const { imageUrl, channelAccessToken, groupId } = JSON.parse(event.body || '{}');

    if (!imageUrl || !channelAccessToken || !groupId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing required parameters (imageUrl, channelAccessToken, groupId)' })
      };
    }

    console.log('[send-line] Forwarding image to LINE Group:', groupId);

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: groupId,
        messages: [
          {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
          }
        ]
      })
    });

    const result = await response.json();
    console.log('[send-line] LINE API response status:', response.status, 'result:', result);

    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
  } catch (err: any) {
    console.error('[send-line] Error forwarding message to LINE:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    };
  }
};
