import { kv } from '@vercel/kv'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { promoCode } = req.body;
      
      if (!promoCode) {
        return res.status(400).json({ error: '请输入促销码' });
      }
      
      // 从KV数据库查询促销码
      const promoData = await kv.get(promoCode);
      
      if (promoData) {
        if (promoData.isUsed) {
          res.status(200).json({
            valid: false,
            message: '此促销码已被使用',
            customer: promoData.fullName,
            product: promoData.productInterest,
            usedAt: promoData.usedAt
          });
        } else {
          res.status(200).json({
            valid: true,
            message: '促销码有效',
            customer: promoData.fullName,
            product: promoData.productInterest,
            email: promoData.email,
            createdAt: promoData.createdAt
          });
        }
      } else {
        res.status(200).json({
          valid: false,
          message: '促销码无效'
        });
      }
      
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}