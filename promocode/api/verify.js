import { initDemoData, getAllPromoCodes } from '../lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    try {
      // 检查环境变量
      const hasEnvVars = process.env.UPSTASH_REDIS_REST_URL && 
                         process.env.UPSTASH_REDIS_REST_TOKEN;
      
      if (!hasEnvVars) {
        return res.status(500).json({
          success: false,
          message: 'Redis环境变量未正确配置',
          environment: {
            urlConfigured: !!process.env.UPSTASH_REDIS_REST_URL,
            tokenConfigured: !!process.env.UPSTASH_REDIS_REST_TOKEN
          }
        });
      }
      
      // 初始化演示数据
      await initDemoData();
      
      // 获取所有促销码验证连接
      const allCodes = await getAllPromoCodes();
      
      res.status(200).json({
        success: true,
        message: 'Redis连接测试成功！',
        timestamp: new Date().toISOString(),
        stats: {
          totalPromoCodes: Object.keys(allCodes).length,
          demoCodes: 2 // 我们初始化了2个演示代码
        },
        environment: {
          urlConfigured: true,
          tokenConfigured: true,
          nodeEnv: process.env.NODE_ENV
        }
      });
      
    } catch (error) {
      console.error('Redis测试错误:', error);
      res.status(500).json({
        success: false,
        message: 'Redis连接失败',
        error: error.message,
        environment: {
          urlConfigured: !!process.env.UPSTASH_REDIS_REST_URL,
          tokenConfigured: !!process.env.UPSTASH_REDIS_REST_TOKEN,
          nodeEnv: process.env.NODE_ENV
        }
      });
    }
  } else {
    res.status(405).json({ 
      success: false, 
      message: '只支持GET请求' 
    });
  }
}
