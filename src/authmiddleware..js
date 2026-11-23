const jwt =require("jsonwebtoken")
const authToken =(req,res,next)=>{
    const authHeader = req.headers.authorization
    const token =authHeader?.split(" ")[1]
    if(!token){
        return res.status(401).json({
            message:"TOKEN required"
        })
    }
    try{
        const decode =jwt.verify(
            token,
            process.env.JWT_SECRET
        )
        req.user =decode
        next()
    }catch(error){
        return res.status(403).json()({
            message:"expired token"
        })
    }
}

module.exports =authToken