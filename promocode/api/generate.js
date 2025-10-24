// api/generate.js - 完整的促销码生成API
const { savePromoCode, initDemoData } = require('../lib/redis.js');

function generatePromoCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PROMO-';
  
  for (let i = 0; i < 8; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

module.exports = async (req, res) => {
  console.log('generate.js 被调用，方法:', req.method);
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // 处理OPTIONS请求（预检请求）
  if (req.method === 'OPTIONS') {
    console.log('处理OPTIONS请求');
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    console.log('处理POST请求');
    
    try {
      // 读取请求体
      let body = '';
      for await (const chunk of req) {
        body += chunk.toString();
      }
      
      console.log('请求体:', body);
      
      let data;
      try {
        data = JSON.parse(body);
      } catch (parseError) {
        console.error('JSON解析错误:', parseError);
        return res.status(400).json({
          success: false,
          message: '请求格式错误，请检查JSON格式'
        });
      }
      
      const { name, product, contact } = data;
      
      console.log('解析后的数据:', { name, product, contact });
      
      // 验证必要参数
      if (!name || !product || !contact) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数：姓名、产品和联系方式'
        });
      }
      
      // 初始化演示数据
      console.log('初始化演示数据...');
      await initDemoData();
      
      // 生成促销码
      const promoCode = generatePromoCode();
      console.log('生成的促销码:', promoCode);
      
      // 保存到Redis
      console.log('保存到Redis...');
      await savePromoCode(promoCode, {
        name: name.trim(),
        product: product.trim(),
        contact: contact.trim()
      });
      
      // 返回成功响应
      console.log('返回成功响应');
      res.status(200).json({
        success: true,
        promoCode: promoCode,
        message: '促销码生成成功！'
      });
      
    } catch (error) {
      console.error('生成促销码过程中发生错误:', error);
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  } else {
    // 处理非POST请求
    console.log('处理非POST请求:', req.method);
    
    res.status(405).json({
      success: false,
      message: '只支持POST请求',
      allowedMethods: ['POST', 'OPTIONS']
    });
  }
};
