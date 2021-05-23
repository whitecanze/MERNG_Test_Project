import { ApolloServer } from 'apollo-server-express'
import { config } from 'dotenv'
import cors from 'cors'
import express from 'express'
import { sequelize } from './models'

config()

const {
    PORT
} = process.env

const resolvers = require('./graphql/resolvers')
const typeDefs = require('./graphql/typeDefs')

const server = new ApolloServer({
    typeDefs,
    resolvers,
    tracing: true,
    context: ctx => ctx,
})

const startServer = async() => {
    try {
        const app = express()
        app.use(cors())
        server.applyMiddleware({ app })
        app.listen({ port: `${PORT}` },
            () => console.log(`Server is up at http://localhost:${PORT}/graphql`)
        )

        await sequelize.authenticate()
            .then(() => console.log(`Database is up!`))
            .catch(err => console.log(err))
    } catch (err) {
        console.log(err)
    }
}

startServer()