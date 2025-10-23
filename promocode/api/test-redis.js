import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  try {
    // 检查环境变量是否存在
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl || !redisToken) {
      return res.status(500).json({
        success: false,
        message: '环境变量未设置',
        details: {
          urlExists: !!redisUrl,
          tokenExists: !!redisToken
        }
      });
    }
    
    // 初始化 Redis 客户端
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    const testData = {
      timestamp: new Date().toISOString(),
      randomValue: Math.random().toString(36).substring(7),
      test: 'Redis connection test'
    };
    
    // 测试 1: 写入数据
    await redis.set('promo:test:connection', JSON.stringify(testData));
    
    // 测试 2: 读取数据
    const readResult = await redis.get('promo:test:connection');
    const parsedResult = JSON.parse(readResult);
    
    // 测试 3: 哈希操作（模拟促销码存储）
    await redis.hset('promo:test:hash', {
      'TEST-123': JSON.stringify({
        name: '测试用户',
        product: '测试产品',
        contact: 'test@example.com',
        createdAt: new Date().toISOString()
      })
    });
    
    const hashResult = await redis.hget('promo:test:hash', 'TEST-123');
    const parsedHash = JSON.parse(hashResult);
    
    // 测试 4: 检查键是否存在
    const keyExists = await redis.exists('promo:test:connection');
    
    // 清理测试数据
    await redis.del('promo:test:connection', 'promo:test:hash');
    
    res.json({
      success: true,
      message: 'Redis 连接测试成功！',
      tests: {
        writeRead: {
          status: 'PASS',
          written: testData,
          read: parsedResult,
          match: JSON.stringify(testData) === JSON.stringify(parsedResult)
        },
        hashOperations: {
          status: 'PASS',
          data: parsedHash
        },
        keyExistence: {
          status: 'PASS',
          exists: keyExists === 1
        },
        environment: {
          urlPreview: redisUrl ? redisUrl.substring(0, 20) + '...' : '未设置',
          tokenPreview: redisToken ? '***' + redisToken.substring(redisToken.length - 4) : '未设置'
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Redis 测试错误:', error);
    
    res.status(500).json({
      success: false,
      message: 'Redis 连接测试失败',
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      environment: {
        urlExists: !!process.env.UPSTASH_REDIS_REST_URL,
        tokenExists: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
}
