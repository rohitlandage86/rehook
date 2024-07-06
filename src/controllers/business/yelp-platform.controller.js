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
//create Yelp platform...
const createYelpPlatform = async (req, res) => {
  const business_id = req.body.business_id ? req.body.business_id : null
  const yelp_id = req.body.yelp_id ? req.body.yelp_id : null
  const business_name = req.body.business_name
    ? req.body.business_name.trim()
    : ''
  const phone_number = req.body.phone_number ? req.body.phone_number : null

  if (!business_id) {
    return error422('Business id is required.', res)
  } else if (!yelp_id) {
    return error422('Yelp id is required.', res)
  } else if (!business_name) {
    return error422('Business name is required.', res)
  } else if (!phone_number) {
    return error422('Phone number is required.', res)
  }

  let connection
  try {
    connection = await pool.connect()
    //check is business id is exist...
    const isBusinessIdExistQuery =
      'SELECT * FROM yelp_platform WHERE business_id = $1'
    const isBusinessIdExistResult = await connection.query(
      isBusinessIdExistQuery,
      [business_id]
    )
    if (isBusinessIdExistResult.rowCount > 1) {
      return error422('A business already has a yelp platform.', res)
    }
    //check is yelp id is exist...
    const isYelpIdExistQuery = 'SELECT * FROM yelp_platform WHERE yelp_id = $1'
    const isYelpIdExistResult = await connection.query(isYelpIdExistQuery, [
      yelp_id
    ])
    if (isYelpIdExistResult.rowCount > 1) {
      return error422('Yelp id already exist.', res)
    }
    //check is phone number is exist...
    const isPhoneNumberExistQuery =
      'SELECT * FROM yelp_platform WHERE phone_number = $1'
    const isPhoneNumberExistResult = await connection.query(
      isPhoneNumberExistQuery,
      [phone_number]
    )
    if (isPhoneNumberExistResult.rowCount > 1) {
      return error422('Phone number already exist.', res)
    }
    //insert into  yelp platform table...
    const yelpPlatformQuery =
      'INSERT INTO yelp_platform (business_id, yelp_id, business_name, phone_number) VALUES ($1, $2, $3, $4)'
    const yelpPlatformValues = [
      business_id,
      yelp_id,
      business_name,
      phone_number
    ]
    const yelpPlatformResult = await connection.query(
      yelpPlatformQuery,
      yelpPlatformValues
    )
    if (yelpPlatformResult.rowCount > 0) {
      return res.status(200).json({
        status: 200,
        message: 'Yelp platform created successfully'
      })
    }
  } catch (error) {
    return error500(error, res)
  } finally {
    if (connection) connection.release()
  }
}
//status change yelp platform...
const statusChange = async (req, res) => {
  const yelp_platform_id = parseInt(req.params.id);
  const status = parseInt(req.query.status); // Validate and parse the status parameter
  let connection;
  try {
    connection = await pool.connect();
      // Check if the yelp platform exists
      const yelpPlatformQuery = "SELECT * FROM yelp_platform WHERE yelp_platform_id = $1";
      const yelpPlatformResult = await connection.query(yelpPlatformQuery, [yelp_platform_id]);

      if (yelpPlatformResult.rowCount === 0) {
          return res.status(404).json({
              status: 404,
              message: "Yelp platform not found.",
          });
      }

      // Validate the status parameter
      if (status !== 0 && status !== 1) {
          return res.status(400).json({
              status: 400,
              message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
          });
      }

      // Soft update the Yelp platform status
      const updateQuery = `
          UPDATE yelp_platform
          SET status = $2
          WHERE yelp_platform_id = $1
      `;

      await connection.query(updateQuery, [yelp_platform_id, status]);

      const statusMessage = status === 1 ? "activated" : "deactivated";

      return res.status(200).json({
          status: 200,
          message: `Yelp platform ${statusMessage} successfully.`,
      });
  } catch (error) {
    return error500(error, res)
  } finally {
    if (connection) connection.release()
  }
}
module.exports = {
  createYelpPlatform,
  statusChange
}
