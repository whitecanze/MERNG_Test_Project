import { User } from '../models'
import { UserInputError, AuthenticationError } from 'apollo-server-express'
import Bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from 'dotenv'
import { Op } from 'sequelize'

config()

const {
    JWT_SECRET
} = process.env

module.exports = {

    Query: {
        getUsers: async (_, __, context) => {
            
            try {
                let user

                if (context.req && context.req.headers.authentication) {
                    const token = context.req.headers.authentication.split('Bearer ')[1]
                    jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
                        if (err) {
                            throw new AuthenticationError('Unauthenticated.')
                        }
                        user = decodedToken
                    })
                }

                const users = await User.findAll({
                    where: { username: { [Op.ne]: user.username } }
                })
                return users
            } catch (err) {
                console.log(err)
                throw new Error(err)
            }
        },
        login: async (_, args) => {
            const { username, password } = args
            let errors = {}

            try {
                if (username.trim() === '')
                    errors.username = 'username must not be empty.'
                if (password.trim() === '')
                    errors.password = 'password must not be empty.'
                
                const user = await User.findOne({
                    where: { username }
                })

                if (!user) {
                    errors.username = 'user not found.'
                }

                if (Object.keys(errors).length > 0) 
                    throw new UserInputError('bad input.', { errors})

                const correctPassword = await Bcrypt.compare(password, user.password)

                if (!correctPassword) {
                    errors.password = 'password is incorrect.'
                    throw new AuthenticationError('password is incorrect.',{errors})
                }

                const token = jwt.sign({
                    username
                }, JWT_SECRET, { expiresIn: "1d" })

                user.token = token

                return {
                    ...user.toJSON(),
                    createdAt: user.createdAt.toISOString(),
                    token,
                }
            } catch (err) {
                console.log(err)
                throw new Error(err)
            }
        }
    },
    Mutation: {
        register: async (_, args) => {
            let { username, email, password, confirmPassword } = args
            let errors = {}
            try {

                // TODO: Validate input data

                if (username.trim() === '')
                    errors.username = 'username must not be empty.'
                if (email.trim() === '')
                    errors.email = 'Email must not be empty.'
                if (password.trim() === '')
                    errors.password = 'password must not be empty.'
                if (confirmPassword.trim() === '')
                    errors.confirmPassword = 'repeat password must not be empty.'
                
                if (password !== confirmPassword)
                    errors.confirmPassword = 'password mush match.'
                
                if (Object.keys(errors).length > 0) {
                    throw errors
                }

                // TODO: Hash password
                password = await Bcrypt.hash(password, 6)

                // TODO: Create user
                const user = await User.create({
                    username,
                    email,
                    password
                })

                // TODO: Return user    
                return user

            } catch (err) {
                console.log('err', err)
                if (err.name === 'SequelizeUniqueConstraintError') {
                    err.errors.forEach( e => (errors[e.path] = `This ${e.path} is already use.`) )
                } else if (err.name === 'SequelizeValidationError') {
                    err.errors.forEach( e => (errors[e.path] = e.message ) )
                }
                throw new UserInputError(`Bad input`,{ errors })
            }
        }
    }
}