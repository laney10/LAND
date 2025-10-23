import { getStats, initDemoData } from '../../lib/upstash.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    try {
      await initDemoData();
      const stats = await getStats();
      
      res.json({
        success: true,
        stats: stats
      });
      
    } catch (error) {
      console.error('Redis 错误:', error);
      res.status(500).json({ 
        success: false, 
        message: '服务器错误' 
      });
    }
  } else {
    res.status(405).json({ 
      success: false, 
      message: '只支持 GET 请求' 
    });
  }
}
