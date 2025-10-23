import { getPromoCode, initDemoData } from '../lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
      
      await initDemoData();
      
      const promoData = await getPromoCode(code.toUpperCase());
      
      if (!promoData) {
        return res.json({ 
          valid: false, 
          message: '无效的促销码，请检查后重试' 
        });
      }
      
      if (promoData.isUsed) {
        return res.json({ 
          valid: false, 
          message: '该促销码已被使用',
          usedAt: promoData.usedAt 
        });
      }
      
      res.json({ 
        valid: true, 
        message: '促销码有效！',
        data: promoData 
      });
      
    } catch (error) {
      console.error('验证促销码错误:', error);
      res.status(500).json({ 
        valid: false, 
        message: '验证服务暂时不可用，请稍后重试' 
      });
    }
  } else {
    res.status(405).json({ 
      valid: false, 
      message: '只支持GET请求' 
    });
  }
}
