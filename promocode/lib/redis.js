let Redis;
try {
  Redis = require('@upstash/redis').Redis;
} catch (error) {
  console.error('无法加载@upstash/redis模块:', error);
}

const PROMO_CODES_KEY = 'promo_codes';

function createRedisClient() {
  if (!Redis) {
    throw new Error('@upstash/redis模块未正确安装');
  }
  
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    throw new Error('Redis环境变量未设置: KV_REST_API_URL 或 KV_REST_API_TOKEN');
  }
  
  console.log('创建Redis客户端，URL:', url.substring(0, 20) + '...');
  
  return new Redis({
    url: url,
    token: token,
  });
}

let redis;
try {
  redis = createRedisClient();
} catch (error) {
  console.error('创建Redis客户端失败:', error);
  redis = null;
}

async function testConnection() {
  if (!redis) {
    return {
      success: false,
      error: 'Redis客户端未初始化'
    };
  }
  
  try {
    await redis.set('connection_test', 'test_value', { ex: 60 }); // 60秒后过期
    const value = await redis.get('connection_test');
    
    if (value === 'test_value') {
      return { success: true };
    } else {
      return {
        success: false,
        error: '连接测试返回值不匹配'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function savePromoCode(promoCode, userData) {
  if (!redis) {
    throw new Error('Redis客户端未初始化');
  }
  
  const promoData = {
    ...userData,
    createdAt: new Date().toISOString(),
    isUsed: false,
    usedAt: null
  };
  
  await redis.hset(PROMO_CODES_KEY, { 
    [promoCode]: promoData 
  });
  
  return promoData;
}

async function getPromoCode(promoCode) {
  if (!redis) {
    throw new Error('Redis客户端未初始化');
  }
  
  const promoData = await redis.hget(PROMO_CODES_KEY, promoCode);
  
  if (!promoData) {
    return null;
  }
  
  return promoData;
}

async function markPromoCodeAsUsed(promoCode) {
  if (!redis) {
    throw new Error('Redis客户端未初始化');
  }
  
  const promoData = await getPromoCode(promoCode);
  
  if (!promoData) {
    return false;
  }
  
  promoData.isUsed = true;
  promoData.usedAt = new Date().toISOString();
  
  await redis.hset(PROMO_CODES_KEY, { 
    [promoCode]: promoData 
  });
  
  return true;
}

async function getAllPromoCodes() {
  if (!redis) {
    console.warn('Redis客户端未初始化，返回空对象');
    return {};
  }
  
  try {
    const allCodes = await redis.hgetall(PROMO_CODES_KEY);
    
    return allCodes || {};
  } catch (error) {
    console.error('获取所有促销码失败:', error);
    return {};
  }
}

async function initDemoData() {
  if (!redis) {
    console.warn('Redis客户端未初始化，跳过演示数据初始化');
    return;
  }
  
  try {
    const exists = await redis.hexists(PROMO_CODES_KEY, 'PROMO-DEMO-001');
    
    if (!exists) {
      console.log('初始化演示数据...');
      
      // 直接存储对象，不需要JSON.stringify
      const demoData = {
        'PROMO-DEMO-001': {
          name: '演示用户张三',
          product: '高级套餐',
          contact: 'zhangsan@example.com',
          createdAt: '2024-01-15T08:30:00Z',
          isUsed: false
        },
        'PROMO-DEMO-002': {
          name: '测试用户李四',
          product: '企业版',
          contact: 'lisi@example.com',
          createdAt: '2024-01-16T14:20:00Z',
          isUsed: true,
          usedAt: '2024-01-17T09:15:00Z'
        }
      };
      
      await redis.hset(PROMO_CODES_KEY, demoData);
      console.log('演示数据初始化完成');
    } else {
      console.log('演示数据已存在，跳过初始化');
    }
  } catch (error) {
    console.error('初始化演示数据失败:', error);
  }
}

async function getStats() {
  if (!redis) {
    return {
      total: 0,
      used: 0,
      available: 0
    };
  }
  
  try {
    const allCodes = await getAllPromoCodes();
    const total = Object.keys(allCodes).length;
    const used = Object.values(allCodes).filter(code => code.isUsed).length;
    
    return {
      total: total,
      used: used,
      available: total - used
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return {
      total: 0,
      used: 0,
      available: 0
    };
  }
}

async function isCodeExists(promoCode) {
  if (!redis) {
    return false;
  }
  
  try {
    const exists = await redis.hexists(PROMO_CODES_KEY, promoCode);
    return exists === 1;
  } catch (error) {
    console.error('检查促销码是否存在失败:', error);
    return false;
  }
}

module.exports = {
  testConnection,
  
  savePromoCode,
  getPromoCode,
  markPromoCodeAsUsed,
  getAllPromoCodes,
  isCodeExists,
  
  initDemoData,
  getStats,
  
  getRedisStatus: () => ({
    isConnected: !!redis,
    hasEnvVars: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  })
};
