const nodemailer = require("nodemailer")
const crypto = require("crypto")
const User = require("../models/user")
const bcryptjs = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { constants } = require("os")


async function sendEmail(email, uniqueText) {
    console.log(email)
    console.log(uniqueText)
    const transporter = nodemailer.createTransport({


        host: "smtp.gmail.com",
        port: 465, //puerto para email
        secure: true,
        auth: {

            user: "orlymytinerary@gmail.com",
            pass:"mytinerary123"  //se guarda en env para que no sea publico
        },
        tls: {
            rejectUnauthorized: false
        }
    })

    const sender = "orlymytinerary@gmail.com"
    const mailOptions = {
        from: sender,
        to: email,
        subject: "User email verification",
        html: `Click <a href=http://localhost:4000/api/verify/${uniqueText}> here </a> to validate your email`,
    }
    await transporter.sendMail(mailOptions, function (error, response) {
        if (error) {
            console.log(error)
        }
        else {
            console.log("Send message")
        }
    })
}



const usersController = {
    verifyEmail: async(req,res)=>{
        const {uniqueText}= req.params
        const user = await User.findOne({uniqueText:uniqueText})
        if(user){
            user.emailVerify= true
             await user.save()
             res.redirect("http://localhost:3000/signin")
        }
        else{
            res.json({success:false, response:"Your email could not be verified"})
        }

    },
    nuevoUsuario: async (req, res) => {
        const { firstname, lastname, email, password, from } = req.body.NuevoUsuario //destructurar variables
        
        
        try {
            const UsuarioExiste = await User.findOne({ email })
            
            if (UsuarioExiste) {
                res.json({ success: "false", response: "User already exists, go to Sing In" })
                if(from!=="signup"){
                   
                    const passwordHash= bcryptjs.hashSync(password, 10)
                    UsuarioExiste.password= passwordHash
                    UsuarioExiste.emailVerify= true
                    UsuarioExiste.from= from
                    UsuarioExiste.connected= false
                    UsuarioExiste.save()
                    res.json({success:true, response:"Actualizamos tu signup para que lo realices con " + from})
                }
                else{
                    res.json({success:false, response:"El nombre del usuario ya está en uso"})
                }
            }
            else {
                const uniqueText = crypto.randomBytes(15).toString("hex")  //genera un texto de letras y numeros de 15 caracteres. Es lo que nos devuelve el usuario cuando verifique su email.
                const emailVerify = false
                const passwordHash = bcryptjs.hashSync(password, 10)
                const NewUser = new User({
                    firstname,
                    lastname,
                    email,
                    password: passwordHash,
                    uniqueText, //busca la coincidencia del texto
                    emailVerify,
                    from,
                })
                if(from!=="signup"){
                     NewUser.emailVerify=true
                     NewUser.from= from
                     NewUser.connected= false
                     await NewUser.save()
                     res.json({success:true,data:{NewUser},response:"Felicitaciones se ha creado tu usuario con "+from})
                }
                else{
                    NewUser.emailVerify=false
                    NewUser.from=from
                    NewUser.connected=false
                    await NewUser.save()
                    await sendEmail(email,uniqueText) //envia email de verificacion al usuario
                    res.json({ success: true, response: "We have sent an email to verify your email" })
                    
                }                
            }
        }
        catch (error) { res.json({ success: "falseVAL", response: null, error: error }) }
    },

    accesoUsuario: async (req, res) => {
        const { email, password } = req.body.userData //userData variable para usar en el front 
        console.log(email)
        console.log(password)
        try {
            const usuario = await User.findOne({ email })
            if (!usuario) {
                res.json({ success: false, from: "controller", error: "usuario y/o contraseña incorrecto" })

            }
            else {
                if (usuario.emailVerify) {
                    let passwordMatch = bcryptjs.compareSync(password, usuario.password)

                    if (passwordMatch) {
                        const token = await jwt.sign({ ...usuario }, process.env.SECRETKEY) //secretkey, variable de entorno
                        const datosUser = {
                            firstname: usuario.firstname,
                            lastname: usuario.lastname,
                            email: usuario.email,
                        }
                        await usuario.save()
                        res.json({ success: true, from: "controller", response: { token, datosUser } })
                    }
                    else {
                        res.json({ success: false, from: "controller", error: "usuario y/o contraseña incorrecto" })
                    }

                }
                else {
                    res.json({ success: false, from: "controller", error: "Verifica tu email para validarte" })
                }

            }

        }
        catch (error) { console.log(error); res.json({ success: false, response: null, error: error }) }
    },

    //cerrarSesion: async (req,res)=>{}
}
module.exports = usersController;

