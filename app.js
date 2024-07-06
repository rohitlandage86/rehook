const express = require('express')
const bodyParser = require('body-parser')
const app = express()
//import routes...
const businessRoute = require('./src/routes/admin/business-type.routes')
const subscriptionRoute = require('./src/routes/admin/subscription.routes')
const periodRoutes = require('./src/routes/admin/period.routes')
const businessRoutes = require('./src/routes/business/business.routes')
const externalRoutes = require('./src/routes/external/external.routes')
const platformRoutes = require('./src/routes/admin/platform.routes')
const googlePlatformRoutes = require('./src/routes/business/google-platform.routes')
const yelpPlatformController = require('./src/routes/business/yelp-platform.routes')

app.use(express.static('public'))
const API_KEY = 'AIzaSyDgWXiufJeXhNVphSICthtCu6vIKl8LgM8'
const axios = require('axios')
// const path = require("path");
app.use(express.json({ limit: '50mb' }))
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin,X-Requested-With,Content-Type,Accept, Authorization'
  )
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PATCH,PUT,DELETE,OPTIONS'
  )
  next()
})
//routes...
app.use('/api/business-type', businessRoute)
app.use('/api/subscription', subscriptionRoute)
app.use('/api/period', periodRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/', externalRoutes)
app.use('/api/platform', platformRoutes)
app.use('/api/google-platform', googlePlatformRoutes)
app.use('/api/yelp-platform', yelpPlatformController)


module.exports = app;