const { Redis } = require('@upstash/redis');

// 初始化Redis客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PROMO_CODES_KEY = 'promo_codes';

async function savePromoCode(promoCode, userData) {
  const promoData = {
    ...userData,
    createdAt: new Date().toISOString(),
    isUsed: false,
    usedAt: null
  };
  
  await redis.hset(PROMO_CODES_KEY, { 
    [promoCode]: JSON.stringify(promoData) 
  });
  
  return promoData;
}

async function getPromoCode(promoCode) {
  const promoData = await redis.hget(PROMO_CODES_KEY, promoCode);
  return promoData ? JSON.parse(promoData) : null;
}

async function markPromoCodeAsUsed(promoCode) {
  const promoData = await getPromoCode(promoCode);
  
  if (!promoData) return false;
  
  promoData.isUsed = true;
  promoData.usedAt = new Date().toISOString();
  
  await redis.hset(PROMO_CODES_KEY, { 
    [promoCode]: JSON.stringify(promoData) 
  });
  
  return true;
}

async function getAllPromoCodes() {
  const allCodes = await redis.hgetall(PROMO_CODES_KEY);
  if (!allCodes) return {};
  
  const result = {};
  for (const [code, data] of Object.entries(allCodes)) {
    if (data) result[code] = JSON.parse(data);
  }
  return result;
}

async function initDemoData() {
  try {
    const exists = await redis.hexists(PROMO_CODES_KEY, 'PROMO-DEMO-001');
    
    if (!exists) {
      const demoData = {
        'PROMO-DEMO-001': JSON.stringify({
          name: '演示用户张三',
          product: '高级套餐',
          contact: 'zhangsan@example.com',
          createdAt: '2024-01-15T08:30:00Z',
          isUsed: false
        })
      };
      
      await redis.hset(PROMO_CODES_KEY, demoData);
      console.log('演示数据初始化完成');
    }
  } catch (error) {
    console.error('初始化演示数据错误:', error);
  }
}

module.exports = {
  savePromoCode,
  getPromoCode,
  markPromoCodeAsUsed,
  getAllPromoCodes,
  initDemoData
};
