// api/test-redis.js - 完整的Redis连接测试API
const { initDemoData, getAllPromoCodes, testConnection } = require('../lib/redis.js');

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS请求（预检请求）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    try {
      console.log('开始测试Redis连接...');
      
      // 检查环境变量
      const hasEnvVars = process.env.UPSTASH_REDIS_REST_URL && 
                         process.env.UPSTASH_REDIS_REST_TOKEN;
      
      console.log('环境变量状态:', {
        urlExists: !!process.env.UPSTASH_REDIS_REST_URL,
        tokenExists: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        urlPreview: process.env.UPSTASH_REDIS_REST_URL ? 
                   process.env.UPSTASH_REDIS_REST_URL.substring(0, 20) + '...' : '未设置'
      });
      
      if (!hasEnvVars) {
        return res.status(200).json({
          success: false,
          message: 'Redis环境变量未正确配置',
          environment: {
            urlConfigured: !!process.env.UPSTASH_REDIS_REST_URL,
            tokenConfigured: !!process.env.UPSTASH_REDIS_REST_TOKEN,
            nodeEnv: process.env.NODE_ENV || '未设置'
          },
          help: '请在Vercel项目设置中添加UPSTASH_REDIS_REST_URL和UPSTASH_REDIS_REST_TOKEN环境变量'
        });
      }
      
      // 测试基本连接
      console.log('测试Redis基本连接...');
      const connectionTest = await testConnection();
      
      if (!connectionTest.success) {
        return res.status(200).json({
          success: false,
          message: 'Redis连接失败',
          error: connectionTest.error,
          environment: {
            urlConfigured: true,
            tokenConfigured: true,
            nodeEnv: process.env.NODE_ENV || '未设置'
          }
        });
      }
      
      // 初始化演示数据
      console.log('初始化演示数据...');
      await initDemoData();
      
      // 获取所有促销码
      console.log('获取所有促销码...');
      const allCodes = await getAllPromoCodes();
      
      // 返回成功结果
      res.status(200).json({
        success: true,
        message: 'Redis连接测试成功！',
        timestamp: new Date().toISOString(),
        stats: {
          totalPromoCodes: Object.keys(allCodes).length,
          demoCodes: Object.keys(allCodes).filter(code => code.includes('DEMO')).length
        },
        sampleData: allCodes,
        environment: {
          urlConfigured: true,
          tokenConfigured: true,
          nodeEnv: process.env.NODE_ENV || '未设置'
        }
      });
      
    } catch (error) {
      console.error('Redis测试过程中发生错误:', error);
      
      res.status(200).json({
        success: false,
        message: 'Redis测试过程中发生错误',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        environment: {
          urlConfigured: !!process.env.UPSTASH_REDIS_REST_URL,
          tokenConfigured: !!process.env.UPSTASH_REDIS_REST_TOKEN,
          nodeEnv: process.env.NODE_ENV || '未设置'
        }
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: '只支持GET请求'
    });
  }
};
