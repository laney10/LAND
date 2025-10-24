const { initDemoData, getAllPromoCodes, testConnection, getRedisStatus } = require('../lib/redis.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    try {
      console.log('开始测试Redis连接...');
      
      const hasEnvVars = process.env.KV_REST_API_URL && 
                         process.env.KV_REST_API_TOKEN;
      
      console.log('环境变量状态:', {
        urlExists: !!process.env.KV_REST_API_URL,
        tokenExists: !!process.env.KV_REST_API_TOKEN,
        urlPreview: process.env.KV_REST_API_URL ? 
                   process.env.KV_REST_API_URL.substring(0, 20) + '...' : '未设置'
      });
      
      if (!hasEnvVars) {
        return res.status(200).json({
          success: false,
          message: 'Redis环境变量未正确配置',
          environment: {
            urlConfigured: !!process.env.KV_REST_API_URL,
            tokenConfigured: !!process.env.KV_REST_API_TOKEN,
            nodeEnv: process.env.NODE_ENV || '未设置'
          },
          help: '请在Vercel项目设置中添加KV_REST_API_URL和KV_REST_API_TOKEN环境变量'
        });
      }
      
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
      
      console.log('初始化演示数据...');
      await initDemoData();
      
      console.log('获取所有促销码...');
      const allCodes = await getAllPromoCodes();
      
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
          urlConfigured: !!process.env.KV_REST_API_URL,
          tokenConfigured: !!process.env.KV_REST_API_TOKEN,
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
