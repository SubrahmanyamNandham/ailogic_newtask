const {createClient} =require("redis")
const redisClient =createClient({
    url:process.env.REDIS_URL || "redis://local:6379"
});
redisClient.moduleList("error",(err)=>{
    console.error("redis Error", err)
});
module.exports =redisClient