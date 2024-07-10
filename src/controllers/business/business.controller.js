const pool = require('../../../db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const API_KEY = 'AIzaSyDgWXiufJeXhNVphSICthtCu6vIKl8LgM8'
const axios = require('axios')
//error 422 handler...
error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    })
}
//error 500 handler ...
error500 = (error, res) => {
    console.log(error);
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    })
}

//business sign up ...
const businessSignUp = async (req, res) => {
    const first_name = req.body.first_name ? req.body.first_name.trim() : null
    const last_name = req.body.last_name ? req.body.last_name.trim() : null
    let contact_number = req.body.contact_number
    const business_type_id = req.body.business_type_id
    const subscription_id = req.body.subscription_id
    const period_id = req.body.period_id
    const business_name = req.body.business_name
        ? req.body.business_name.trim()
        : null
    const email_id = req.body.email_id ? req.body.email_id.trim() : null
    let password = req.body.password
    const ip = req.body.ip ? req.body.ip.trim() : null
    const type = req.body.type ? req.body.type.trim() : null

    // Validate input data
    if (!first_name) {
        return error422('First name is required.', res)
    } else if (!last_name) {
        return error422('Last name is required.', res)
    } else if (!business_type_id) {
        return error422('Business type is required.', res)
    } else if (!business_name) {
        return error422('Business name is required.', res)
    } else if (!email_id) {
        return error422('Email is required.', res)
    } else if (!password) {
        return error422('Password is required.', res)
    } else if (!type) {
        return error422('Type is required.', res)
    } else if (!subscription_id && subscription_id != 0) {
        return error422('Subscription is required', res)
    }
    let connection = await pool.connect()
    const convertedContactNumber = String(contact_number)

    // Check if the business with the provided business_name exists and is active
    const isBusinessQuery =
        'SELECT * FROM business WHERE TRIM(LOWER(business_name)) = $1'
    const isBusinessResult = await connection.query(isBusinessQuery, [
        business_name.toLowerCase()
    ])
    if (isBusinessResult.rowCount !== 0) {
        return error422('Business name already exists.', res)
    }

    //check if the  contact number  with the provided business exists
    const businessContactNumberQuery =
        'SELECT * FROM business WHERE TRIM(LOWER(contact_number)) = $1'
    const businessContactNumberResult = await connection.query(
        businessContactNumberQuery,
        [convertedContactNumber.trim().toLowerCase()]
    )
    if (businessContactNumberResult.rowCount !== 0) {
        return error422('Business contact already exists', res)
    }

    // Check if the email_id with the provided business exists
    const emailIdExistingQuery =
        'SELECT * FROM business WHERE TRIM(LOWER(email_id)) = $1'
    const emailIdExistingResult = await connection.query(emailIdExistingQuery, [
        email_id.toLowerCase()
    ])
    if (emailIdExistingResult.rowCount !== 0) {
        return error422('Email id already exists', res)
    }

    try {
        // Start a transaction
        await connection.query('BEGIN')
        // Insert business data into the database without business_id
        const businessInsertValues = [
            first_name,
            last_name,
            business_type_id,
            business_name,
            email_id,
            convertedContactNumber,
            ip
        ]
        const businessInsertQuery =
            'INSERT INTO business (first_name, last_name, business_type_id, business_name, email_id, contact_number, ip) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING business_id'
        const businessInsertResult = await connection.query(
            businessInsertQuery,
            businessInsertValues
        )
        const business_id = businessInsertResult.rows[0].business_id

        // Generate unique_identification by combining business_id and business_name
        const unique_identification = `${business_name}_${business_id}`
        // Update the business record with the generated unique_identification
        const updateBusinessQuery =
            'UPDATE business SET business_identification = $1 WHERE business_id = $2'
        const updateBusinessValues = [unique_identification, business_id]
        await connection.query(updateBusinessQuery, updateBusinessValues)
        //insert into  subscription plan table
        const nowDate = new Date().toISOString().split('T')[0]
        let endDate
        let amount

        // Check if the subscription_id is non-zero to calculate the end date
        if (subscription_id && subscription_id != 0) {
            //check if subscription exists
            const subscriptionQuery =
                'SELECT * FROM subscription_master_header WHERE subscription_id = $1'
            const subscriptionResult = await connection.query(subscriptionQuery, [
                subscription_id
            ])

            if (subscriptionQuery.rowCount == 0) {
                await connection.query('ROLLBACK')
                return res.status(404).json({
                    status: 400,
                    message: 'Subscription not found'
                })
            }
            const getSubscriptionQuery =
                'SELECT * FROM subscription_master_footer WHERE subscription_id=$1 AND period_id = $2'
            const getSubscriptionResult = await connection.query(getSubscriptionQuery, [
                subscription_id,
                period_id
            ])
            let selectedSubscription = getSubscriptionResult.rows[0]

            const period = selectedSubscription.no_of_days
            amount = selectedSubscription.price

            // Calculate the end date based on the current date (nowDate), period, and period_unit
            endDate = calculateEndDate(nowDate, period, 'days')
            // Calculate the end date function
            function calculateEndDate(startDate, period, periodUnit) {
                let endDate = new Date(startDate)
                // Use a switch statement to handle different period units (days, months, years)
                switch (periodUnit) {
                    case 'days':
                        endDate.setDate(endDate.getDate() + period)
                        break
                    case 'months':
                        endDate.setMonth(endDate.getMonth() + period)
                        break
                    case 'years':
                        endDate.setFullYear(endDate.getFullYear() + period)
                        break
                    default:
                        throw new Error('Invalid period unit')
                }

                // Convert the endDate to ISO format
                return endDate.toISOString().split('T')[0]
            }
        } else {
            endDate = null
            amount = 0
        }

        const business_sub_plan =
            'INSERT INTO business_subscription_plan (business_id, subscription_id, start_date, end_date, period_id) VALUES($1, $2, $3, $4, $5)'
        const business_sub_plan_Values = [
            business_id,
            subscription_id,
            nowDate,
            endDate,
            period_id
        ]
        const agent_sub_plan_Result = await connection.query(
            business_sub_plan,
            business_sub_plan_Values
        )

        const logQuery =
            'INSERT INTO log (untitled_id, ip, type ) VALUES ($1, $2, $3)'
        const logValues = [business_id, ip, type]
        const log = await connection.query(logQuery, logValues)

        // Insert into untitled table
        const hash = await bcrypt.hash(password, 10) // Hash the password using bcrypt
        const untitledQuery =
            'INSERT INTO untitled (business_id, email_id, extenstions,category) VALUES ($1, $2, $3, $4) RETURNING untitled_id'
        const untitledValues = [business_id, email_id, hash, 2]
        const untitled = await connection.query(untitledQuery, untitledValues)

        //Gerenate  a JWT token
        const token = jwt.sign(
            {
                business_id: business_id,
                email_id: email_id
            },
            'secret_this_should_be',
            { expiresIn: '1h' }
        )
        const businessInfoQuery = `SELECT b.*, bt.business_type FROM business b LEFT JOIN business_type  bt ON bt.business_type_id = b.business_type_id WHERE b.business_id = $1`
        const businessInfoResult = await connection.query(businessInfoQuery, [
            business_id
        ])
        const businessInfo = businessInfoResult.rows[0]
        // commit the transaction
        await connection.query('COMMIT')
        return res.status(200).json({
            status: 200,
            message: 'Business sign up successful.',
            token: token,
            expiresIn: 3600, //1 hour in seconds
            category: untitled.category,
            business_id: business_id,
            business: businessInfo
        })
    } catch (error) {
        await connection.query('ROLLBACK')
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}

//business login
const businessLogin = async (req, res) => {
    const email_id = req.body.email_id ? req.body.email_id.trim() : null
    const password = req.body.password ? req.body.password.trim() : null
    let type = req.body.type ? req.body.type.trim() : null
    const ip = req.body.id ? req.body.ip : null
    type = 'login'
    if (!email_id) {
        return error422('Email id is required.', res)
    } else if (!password) {
        return error422('Password is required.', res)
    } else if (!type) {
        return error422('Type is Required.', res)
    }
    let connection = await pool.connect();

    const checkBusinessQuery =
        'SELECT * FROM business WHERE LOWER(TRIM(email_id)) = $1 AND status = 1'
    const businessResult = await connection.query(checkBusinessQuery, [
        email_id.toLowerCase()
    ])
    const business = businessResult.rows[0]
    if (!business) {
        return error422('Authentication failed.', res)
    }

    //compare the provided password with the hashed password stored in the untitled table
    const checkUntitledQuery =
        'SELECT * FROM untitled WHERE LOWER(TRIM(email_id)) = $1'
    const untitledResult = await connection.query(checkUntitledQuery, [
        email_id.toLowerCase()
    ])
    const untitled = untitledResult.rows[0]
    if (!untitled) {
        return error422('Authentication failed.', res)
    }
    try {
        // return res.json({"hii":untitled.extenstions})
        const isPasswordValid = await bcrypt.compare(password, untitled.extenstions)
        if (!isPasswordValid) {
            return error422('Password worng.', res)
        }
        //Generate a JWT token
        const token = jwt.sign(
            {
                untitled_id: untitled.untitled_id,
                business_id: business.business_id,
                email_id: business.email_id
            },
            'secret_this_should_be',
            { expiresIn: '1h' }
        )
        // get business details...
        const businessInfoQuery = `SELECT b.*, bt.business_type FROM business b LEFT JOIN business_type bt ON bt.business_type_id = b.business_type_id WHERE b.business_id = $1`
        const businessInfoResult = await connection.query(businessInfoQuery, [
            business.business_id
        ])
        const businessInfo = businessInfoResult.rows[0]

        //insert into log table...
        const logQuery =
            'INSERT INTO log (untitled_id, ip, type ) VALUES ($1, $2, $3)'
        const logValues = [untitled.business_id, ip, type]
        const log = await connection.query(logQuery, logValues)

        return res.status(200).json({
            status: 200,
            message: 'Authentication successfully',
            token: token,
            expiresIn: 3600,
            category: untitled.category,
            business_id: untitled.business_id,
            business: businessInfo
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
const getBusinessList = async (req, res) => {
    const businessName = req.query.name

    if (businessName) {
        const base_url =
            'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?'
        const params = {
            input: businessName,
            inputtype: 'textquery',
            fields: 'name,formatted_address,formatted_phone_number,website,rating',
            key: API_KEY
        }

        try {
            const response = await axios.get(base_url, { params })

            console.log(response)
            if (response.status === 200) {
                const data = response.data
                if (data.candidates && data.candidates.length > 0) {
                    const businessData = data.candidates[0]
                    res.json({
                        name: businessData.name || 'N/A',
                        address: businessData.formatted_address || 'N/A',
                        phone: businessData.formatted_phone_number || 'N/A',
                        website: businessData.website || 'N/A',
                        rating: businessData.rating || 'N/A'
                    })
                } else {
                    res.json({ error: 'Business not found' })
                }
            } else {
                res.status(response.status).json({ error: 'Failed to fetch data' })
            }
        } catch (error) {
            console.error('Error:', error)
            res.status(500).json({ error: 'Internal Server Error' })
        }
    } else {
        res.json({ error: 'Invalid input' })
    }
}
const businessLogout = async (req, res) => {
    const business_id = req.companyData.business_id
    const type = req.body.type ? req.body.type : null
    const ip = req.body.ip ? req.body.ip : null
    if (type != 'logout') {
        return error422('Logout type is required.', res)
    }
    let connection = await pool.connect();

    try {
        //insert into log table...
        const logQuery =
            'INSERT INTO log (untitled_id, ip, type ) VALUES ($1, $2, $3)'
        const logValues = [business_id, ip, type]
        const log = await connection.query(logQuery, logValues)
        res.status(200).json({
            status: 200,
            message: 'Logout successfully...!!!'
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    businessSignUp,
    businessLogin,
    getBusinessList,
    businessLogout
}