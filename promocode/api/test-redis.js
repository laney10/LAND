// 确保使用正确的导入方式
const { initDemoData, getAllPromoCodes } = require('../lib/redis.js');

module.exports = async (req, res) => {
  try {
    console.log('test-redis API 被调用');
    
    // 检查环境变量
    const hasEnvVars = process.env.UPSTASH_REDIS_REST_URL && 
                       process.env.UPSTASH_REDIS_REST_TOKEN;
    
    console.log('环境变量检查:', {
      urlExists: !!process.env.UPSTASH_REDIS_REST_URL,
      tokenExists: !!process.env.UPSTASH_REDIS_REST_TOKEN
    });
    
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
    
    // 尝试初始化演示数据
    await initDemoData();
    
    // 获取所有促销码验证连接
    const allCodes = await getAllPromoCodes();
    
    res.status(200).json({
      success: true,
      message: 'Redis连接测试成功！',
      timestamp: new Date().toISOString(),
      stats: {
        totalPromoCodes: Object.keys(allCodes).length
      }
    });
    
  } catch (error) {
    console.error('Redis测试错误:', error);
    res.status(500).json({
      success: false,
      message: 'Redis连接失败: ' + error.message,
      error: error.message
    });
  }
};
