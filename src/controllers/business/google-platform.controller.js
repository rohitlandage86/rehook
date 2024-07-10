const pool = require('../../../db')
//error 422 handler
error422 = (message, res) => {
  return res.status(422).json({
    status: 422,
    message: message
  })
}
//error 500 handler
error500 = (error, res) => {
  console.log(error)
  return res.status(500).json({
    status: 500,
    message: 'Internal Server Error',
    error: error
  })
}
//create Gooogle platform...
const createGooglePlatform = async (req, res) => {
  const business_id = req.body.business_id ? req.body.business_id : null
  const place_id = req.body.place_id ? req.body.place_id : null
  const business_name = req.body.business_name
    ? req.body.business_name.trim()
    : ''
  const email_id = req.body.email_id ? req.body.email_id.trim() : ''
  const business_status = req.body.business_status
    ? req.body.business_name.trim()
    : ''

  if (!business_id) {
    return error422('Business id is required.', res)
  } else if (!place_id) {
    return error422('Place id is required.', res)
  } else if (!business_name) {
    return error422('Business name is required.', res)
  } else if (!email_id) {
    return error422('Email id is required.', res)
  }

  let connection
  try {
    connection = await pool.connect()
    //check is business id is exist...
    const isBusinessIdExistQuery =
      'SELECT * FROM google_platform WHERE business_id = $1'
    const isBusinessIdExistResult = await connection.query(
      isBusinessIdExistQuery,
      [business_id]
    )
    if (isBusinessIdExistResult.rowCount >= 1) {
      return error422('A business already has a Google platform.', res)
    }
    //check is place id is exist...
    const isPlaceIdExistQuery =
      'SELECT * FROM google_platform WHERE place_id = $1'
    const isPlaceIdExistResult = await connection.query(isPlaceIdExistQuery, [
      place_id
    ])
    if (isPlaceIdExistResult.rowCount >= 1) {
      return error422('Place id already exist.', res)
    }
    //check is email id is exist...
    const isEmailIdExistQuery =
      'SELECT * FROM google_platform WHERE TRIM(LOWER(email_id)) = $1'
    const isEmailIdExistResult = await connection.query(isEmailIdExistQuery, [
      email_id.toLowerCase()
    ])
    if (isEmailIdExistResult.rowCount >= 1) {
      return error422('Email id already exist.', res)
    }
    //insert into google platform table...
    const googlePlatformQuery =
      'INSERT INTO google_platform (business_id, place_id, business_name, email_id, business_status) VALUES ($1, $2, $3, $4, $5)'
    const googlePlatformValues = [
      business_id,
      place_id,
      business_name,
      email_id,
      business_status
    ]
    const googlePlatformResult = await connection.query(
      googlePlatformQuery,
      googlePlatformValues
    )
    if (googlePlatformResult.rowCount > 0) {
      return res.status(200).json({
        status: 200,
        message: 'Google platform created successfully'
      })
    }
  } catch (error) {
    return error500(error, res)
  } finally {
    if (connection) connection.release()
  }
}
//status change google platform...
const statusChange = async (req, res) => {
  const google_platform_id = parseInt(req.params.id);
  const status = parseInt(req.query.status); // Validate and parse the status parameter
  let connection;
  try {
    connection = await pool.connect();
      // Check if the goolge platform exists
      const googlePlatformQuery = "SELECT * FROM google_platform WHERE google_platform_id = $1";
      const googlePlatformResult = await connection.query(googlePlatformQuery, [google_platform_id]);

      if (googlePlatformResult.rowCount === 0) {
          return res.status(404).json({
              status: 404,
              message: "Google platform not found.",
          });
      }

      // Validate the status parameter
      if (status !== 0 && status !== 1) {
          return res.status(400).json({
              status: 400,
              message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
          });
      }

      // Soft update the goolge platform status
      const updateQuery = `
          UPDATE google_platform
          SET status = $2
          WHERE google_platform_id = $1
      `;

      await connection.query(updateQuery, [google_platform_id, status]);

      const statusMessage = status === 1 ? "activated" : "deactivated";

      return res.status(200).json({
          status: 200,
          message: `Google platform ${statusMessage} successfully.`,
      });
  } catch (error) {
    return error500(error, res)
  } finally {
    if (connection) connection.release()
  }
}
module.exports = {
  createGooglePlatform,
  statusChange
}
