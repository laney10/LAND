import { markPromoCodeAsUsed, initDemoData } from '../../lib/upstash.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'POST') {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ 
          success: false, 
          message: '缺少促销码参数' 
        });
      }
      
      // 初始化演示数据
      await initDemoData();
      
      const success = await markPromoCodeAsUsed(code.toUpperCase());
      
      if (!success) {
        return res.json({ 
          success: false, 
          message: '促销码不存在' 
        });
      }
      
      res.json({ 
        success: true, 
        message: '促销码已标记为使用' 
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
      message: '只支持 POST 请求' 
    });
  }
}
