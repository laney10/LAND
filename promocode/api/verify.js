import { getPromoCode, initDemoData } from '../../lib/upstash.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ 
          valid: false, 
          message: '请输入促销码' 
        });
      }
      
      // 初始化演示数据
      await initDemoData();
      
      const promoData = await getPromoCode(code.toUpperCase());
      
      if (!promoData) {
        return res.json({ 
          valid: false, 
          message: '无效的促销码' 
        });
      }
      
      if (promoData.isUsed) {
        return res.json({ 
          valid: false, 
          message: '该促销码已被使用' 
        });
      }
      
      res.json({ 
        valid: true, 
        message: '有效的促销码',
        data: promoData 
      });
      
    } catch (error) {
      console.error('Redis 错误:', error);
      res.status(500).json({ 
        valid: false, 
        message: '服务器错误' 
      });
    }
  } else {
    res.status(405).json({ 
      valid: false, 
      message: '只支持 GET 请求' 
    });
  }
}
