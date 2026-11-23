require('dotenv').config();
const app =require("./app")
const PORT =process.nextTick.PORT || 5000
app.listen(PORT,()=>{
    console.log('SERVER IS RUNNING')
});