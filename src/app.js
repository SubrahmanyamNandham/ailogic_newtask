const express =require("express")
const authRoutes =require('./authRoutes')
const app =express()
app.use(express.json())
app.use("/api/auth",authRoutes)
app.get("/",(req,res)=>{
    res.send("Authentication api is runnng")
})
module.exports =app