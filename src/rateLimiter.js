const {RateLimiterRedis} =require("rate-limiter-flexible")
const redisClient =require("./redis")
const loginLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix:'login_limit',
    points: 5,
    duration : 60,
    blockDuration: 60
})

const ratelimiter = async (req, res, next)=>{
    try{
        await loginLimiter.consume(req.ip)
        next()
    }catch(error){
    
    }
}

module.exports =ratelimiter