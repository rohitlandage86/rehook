const pool = require('../../../db')
//error 422 handler...
const error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    })
}
//error 500 handler...
const error500 = (error, res) => {
    console.log(error)
    return res.status(500).json({
        status: 500,
        message: 'Internal Server Error',
        error: error
    })
}

// create business type...
const businessTypeCreate = async (req, res) => {
    let business_type = req.body.business_type
        ? req.body.business_type.trim()
        : null
    let description = req.body.description ? req.body.description : null
    const untitled_id = req.companyData.untitled_id
    // Validate input data
    if (!business_type) {
        return error422('Business type is required', res)
    }

    let connection = await pool.connect()

    //check if the busines type with the provided business type exists and is active
    const businessTypeQuery =
        'SELECT * FROM business_type WHERE TRIM(LOWER(business_type)) = $1'
    const businessTypeResult = await connection.query(businessTypeQuery, [
        business_type.toLowerCase()
    ])
    if (businessTypeResult.rowCount > 0) {
        return error422('Business type already exists', res)
    }

    try {
        await connection.query('BEGIN')
        const businessTypeQuery =
            'INSERT INTO business_type (business_type, description, untitled_id) VALUES ($1, $2, $3)'
        const businessTypeValues = [business_type, description, untitled_id]
        const businessTypeResult = await connection.query(
            businessTypeQuery,
            businessTypeValues
        )
        await connection.query('COMMIT')
        return res.status(200).json({
            status: 200,
            message: 'Business Type created successfully'
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
// get business type and search option...
const getBusinessTypes = async (req, res) => {
    const { page, perPage, key } = req.query
    let connection = await pool.connect()
    try {
        let query = 'SELECT * FROM business_type'
        let countQuery = 'SELECT COUNT(*) AS total FROM business_type'
        //check if 'key' parameter is provided
        if (key) {
            const lowercaseKey = key.toLowerCase().trim()
            if (key === 'activated') {
                query += ' WHERE status = 1'
                countQuery += ' WHERE status = 1'
            } else if (key === 'deactivated') {
                query += ' WHERE status = 0'
                countQuery += ' WHERE status = 0'
            } else {
                query += ` WHERE LOWER(business_type) LIKE '%${lowercaseKey}%'`
                countQuery += ` WHERE LOWER(business_type) LIKE '%${lowercaseKey}%'`
            }
        }
        query += ' ORDER BY created_at DESC'
        let total = 0
        // Apply pagination if both page and perPage are provided
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult.rows[0].total)

            const start = (page - 1) * perPage
            query += ` LIMIT '${perPage}' OFFSET '${start}'`
        }
        const result = await connection.query(query)
        const businessType = result.rows
        const data = {
            status: 200,
            message: 'Business Type retrieved successfully',
            data: businessType
        }
        // Add pagination information if provided
        if (page && perPage) {
            data.pagination = {
                per_page: perPage,
                total: total,
                current_page: page,
                last_page: Math.ceil(total / perPage)
            }
        }
        return res.status(200).json(data)
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
// get business type by id...
const getBusinessType = async (req, res) => {
    const businessTypeId = parseInt(req.params.id)
    let connection = await pool.connect()
    try {
        const businessTypeQuery =
            'SELECT * FROM business_type WHERE business_type_id = $1'
        const businessTypeResult = await connection.query(businessTypeQuery, [
            businessTypeId
        ])
        if (businessTypeResult.rowCount === 0) {
            return res.status(404).json({
                status: 404,
                message: 'Business type not found.'
            })
        }
        const businessType = businessTypeResult.rows[0]

        return res.status(200).json({
            status: 200,
            data: businessType
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
//update business type...
const updateBusinessType = async (req, res) => {
    const businessTypeId = parseInt(req.params.id)
    let business_type = req.body.business_type
        ? req.body.business_type.trim()
        : null
    let description = req.body.description ? req.body.description.trim() : null
    const untitled_id = req.companyData.untitled_id;
    // Validate input data
    if (!business_type) {
        return error422("Business Type is required", res)
    }

    let connection
    try {
        connection = await pool.connect()
        // Check if the provided business type exists and is active
        const existingBusinessTypeQuery =
            'SELECT * FROM business_type WHERE TRIM(LOWER(business_type)) = $1 AND business_type_id !=$2'
        const existingBusinessTypeResult = await connection.query(
            existingBusinessTypeQuery,
            [business_type.toLowerCase(), businessTypeId]
        )

        if (existingBusinessTypeResult.rowCount > 0) {
            return error422("Business Type already exists.", res)
        }

        const nowDate = new Date().toISOString().split('T')[0]
        // Update the Business Type record with new data
        const updateQuery = `
            UPDATE business_type
            SET business_type = $1, description = $2, untitled_id = $3, modify_at=$4
            WHERE business_type_id = $5
        `

        await connection.query(updateQuery, [
            business_type,
            description,
            untitled_id,
            nowDate,
            businessTypeId
        ])

        return res.status(200).json({
            status: 200,
            message: 'Business Type updated successfully.'
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
//status change...
const onStatusChange = async (req, res) => {
    const businessTypeId = parseInt(req.params.id)
    const status = parseInt(req.query.status) // Validate and parse the status parameter
    let connection 
    try {
        connection = await pool.connect()
        // Check if the business type exists
        const businessTypeQuery =
            'SELECT * FROM business_type WHERE business_type_id = $1'
        const businessTypeResult = await connection.query(businessTypeQuery, [
            businessTypeId
        ])
        if (businessTypeResult.rowCount === 0) {
            return res.status(404).json({
                status: 404,
                message: 'Business type not found.'
            })
        }
        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message:
                    'Invalid status value. Status must be 0 (inactive) or 1 (active).'
            })
        }
        // Soft update the business type status
        const updateQuery = `
            UPDATE business_type
            SET status = $2
            WHERE business_type_id = $1
        `
        await connection.query(updateQuery, [businessTypeId, status])

        const statusMessage = status === 1 ? 'activated' : 'deactivated'

        return res.status(200).json({
            status: 200,
            message: `Business Type ${statusMessage} successfully.`
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
//get business type active...
const getBusinessTypesWma = async (req, res) => {
    let businessTypeQuery =
        'SELECT * FROM business_type WHERE status = 1 ORDER BY created_at DESC'
    let connection
    try {
        connection = await pool.connect()
        const businessTypeResult = await connection.query(businessTypeQuery)
        const businessType = businessTypeResult.rows
        return res.status(200).json({
            status: 200,
            message: 'Business Type retrieved successfully.',
            data: businessType
        })
    } catch (error) {
        return error500(error, res)
    } finally{
        if (connection) connection.release()
    }
}

module.exports = {
    businessTypeCreate,
    getBusinessTypes,
    getBusinessType,
    updateBusinessType,
    onStatusChange,
    getBusinessTypesWma
}
