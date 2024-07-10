const pool = require('../../../db')
//error 422 handle...
error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    })
}
// error 500 handle...
error500 = (error, res) => {
    return res.status(500).json({
        status: 500,
        message: 'Internal Server Error',
        error: error
    })
}
//create platform...
const createPlatform = async (req, res) => {
    let platform_name = req.body.platform_name ? req.body.platform_name : null
    let api_key = req.body.api_key ? req.body.api_key.trim() : null
    let description = req.body.description ? req.body.description.trim() : null
    let untilted_id = req.companyData.untilted_id;
    //validate input data
    if (!platform_name) {
        return error422('Paltform name is required.', res)
    } else if (!api_key) {
        return error422('API Key is required.', res)
    } else if (!untilted_id) {
        return error422('Business id required.', res)
    }
    //check if the platform with the provided  platform name exists
    const platformQuery =
        'SELECT * FROM  platform  WHERE TRIM(LOWER(platform_name)) = $1'
    const platformResult = await pool.query(platformQuery, [
        platform_name.trim().toLowerCase()
    ])
    if (platformResult.rowCount !== 0) {
        return error422('Platform Already exists.', res)
    }
    let connection
    try {
        connection = await pool.connect()
        await connection.query('BEGIN')
        const insertQuery =
            'INSERT INTO platform (platform_name,api_key, description) VALUES ($1, $2, $3)'
        const insertValues = [platform_name, api_key, description]
        const insertResult = await connection.query(insertQuery, insertValues)
        await connection.query('COMMIT')
        return res.status(200).json({
            status: 200,
            message: 'Platform created successfully'
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}

//get platform list with pagination and search api...
const getPlatforms = async (req, res) => {
    const { page, perPage, key } = req.query
    let connection
    try {
        connection = await pool.connect()
        let query = 'SELECT * FROM platform '
        let countQuery = 'SELECT COUNT(*) AS total FROM platform '
        if (key) {
            const lowerCaseKey = key.toLowerCase().trim()
            if (key == 'activated') {
                query += ' WHERE status = 1'
                countQuery += ' WHERE status = 1'
            } else if (key == 'deactivated') {
                query += ' WHERE status = 0'
                countQuery += ' WHERE status = 0'
            } else {
                query += ` WHERE LOWER(platform_name) LIKE '%${lowerCaseKey}%'`
                countQuery += ` WHERE LOWER(platform_name) LIKE '%${lowerCaseKey}%'`
            }
        }

        query += ' ORDER BY created_at DESC'
        let total = 0
        //apply pagination if both page and perPage are provided
        if (page && perPage) {
            const totalResult = await connection.query(countQuery)
            total = parseInt(totalResult.rows[0].total)
            const start = (page - 1) * perPage
            query += ` LIMIT ${perPage} OFFSET ${start}`
        }
        const result = await connection.query(query)
        const platform = result.rows
        const data = {
            status: 200,
            message: 'Platform retrieved successfully',
            data: platform
        }
        //Add pagination information if provided
        if (page & perPage) {
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

//get platform by id...
const getPlatform = async (req, res) => {
    const platform_id = parseInt(req.params.id)
    let connection
    try {
        connection = await pool.connect()
        let query = `SELECT * FROM platform WHERE platform_id =${platform_id}`
        const result = await connection.query(query)
        const platform = result.rows[0]
        const data = {
            status: 200,
            messgae: 'Platform retrieved successfully',
            data: platform
        }
        return res.status(200).json(data)
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}

//update platform...
const updatePlatform = async (req, res) => {
    const platform_id = parseInt(req.params.id)
    const platform_name = req.body.platform_name
        ? req.body.platform_name.trim()
        : null
    const api_key = req.body.api_key ? req.body.api_key.trim() : null
    const description = req.body.description ? req.body.description.trim() : null

    //validate input  data
    if (!platform_name) {
        return error422('Platform name is required.', res)
    } else if (!api_key) {
        return error422('API Key is required.', res)
    } else if (!platform_id) {
        return error422('Platform Id is required.', res)
    }
    //check if platform exists...
    const platformQuery = 'SELECT * FROM platform WHERE platform_id = $1'
    const platformResult = await pool.query(platformQuery, [platform_id])

    if (platformResult.rowCount === 0) {
        return res.status(200).json({
            status: 404,
            message: 'Platform not found.'
        })
    }
    // Check if the provided platform exists
    const existingPlatformQuery =
        'SELECT * FROM platform  WHERE  LOWER(platform_name) = $1 AND platform_id != $2'
    const existingPlatformResult = await pool.query(existingPlatformQuery, [
        platform_name.toLowerCase(),
        platform_id
    ])
    if (existingPlatformResult.rowCount > 0) {
        return error422('Platform name already exists.', res)
    }
    let connection
    try {
        connection = await pool.connect()
        const updateQuery = `UPDATE platform SET platform_name = $1, api_key = $2,  description =$3 WHERE platform_id =$4`
        const updateValues = [platform_name, api_key, description, platform_id]
        const updateResult = await connection.query(updateQuery, updateValues)
        return res.status(200).json({
            status: 200,
            message: 'Platform updated successfully.'
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}

//status change...
const onStatusChange = async (req, res) => {
    const platform_id = parseInt(req.params.id)
    const status = parseInt(req.query.status)
    let connection
    try {
        connection = await pool.connect()
        //check if the platform exists
        const platformQuery = 'SELECT * FROM platform WHERE platform_id = $1'
        const platformResult = await connection.query(platformQuery, [platform_id])
        if (platformResult.rowCount == 0) {
            return res.status(404).json({
                status: 404,
                message: 'Platform not found'
            })
        }
        //validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message:
                    'Invalid status value. Status must be 0 (inactive) or 1 (active).'
            })
        }
        //soft update the platform status
        const updateQuery = `UPDATE platform SET status=$2 WHERE platform_id=$1`
        await connection.query(updateQuery, [platform_id, status])
        const statusMessage = status === 1 ? 'activated' : 'deactivated'
        return res.status(200).json({
            status: 200,
            message: `Platform ${statusMessage} successfully.`
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}

//get platform active...
const getPaltformWma = async (req, res) => {
    let connection
    try {
        connection = await pool.connect()
        let platformQuery ='SELECT * FROM platform WHERE status = 1 ORDER BY created_at DESC'
        const platformResult = await connection.query(platformQuery)
        const platform = platformResult.rows
        return res.status(200).json({
            status: 200,
            message: 'Platform retrieved successfully.',
            data: platform
        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}
module.exports = {
    createPlatform,
    getPlatforms,
    getPlatform,
    updatePlatform,
    onStatusChange,
    getPaltformWma
}
