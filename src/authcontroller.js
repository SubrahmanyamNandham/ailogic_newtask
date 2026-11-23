const bcrypt =require("bcrypt")
const jwt = require("jsonwebtoken")
const pool =require("./db")


const register =async(req,res)=>{
    try{
        const {name, email,password}= req.body;
        if(!name || !email || !password){
            return res.status(400).json({
                message:"all fields are required"
            })
        }

        const hashedpassword =await bcrypt.hash(password,12);
        const result = await pool.query(
            `INSERT INTO users(name,email.password)
            VALUES($1,$2,$3)
            RERTURNING id,name,email`,
            [name,email,hashedpassword]

        )
        res.status(201).json({
            message:"USER REGISTERED SUCCESSFULLY",
            user: result.rows(0)
        })
    }catch(error){
        if(error.code === "23234"){
            return res.status(409).json({
                message:"email already exists"
            })
        }
    }

    const login  =async (req,res) =>{
        try{
            const {email, password} = req.body;

             if(!email || !password){
             return res.status(400).json({
                message:"email and password required"
            })
        }
        const result = await pool.query(
            'SELECT * FROM users WHERE eail =$1',
            [email]
        )
        if(result.rows.length ===0){
            return res.status(401).json({
                message: "invalid email and password"
            })
        }
        const user = result.rows(0)
        const isMatch =await bcrypt.compare(
            password,
            user.password
        );
        if(isMatch){
            return res.status(401).json({
                message:"nvalid email or passwrd"
            })
        }
        const token =jwt.sign(
            {userId :user.id},
            process.env.JWT_SECRET,
            {expiresIn :"2h"}
        );
        res.status(200).json({
            message:"LOGIN SUCCESSFULL",
            token,
            user:{
                id:user.id,
                name:user.name,
                email:user.email
            }
        });
        }catch(error){
            res.status(500).json({
                message:"internal server error"
            })
        }

    }
}

module.exports ={register, login }