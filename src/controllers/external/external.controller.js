const pool = require('../../../db')
const axios = require('axios')
const path = require('path');
const fs = require('fs');
//GOOGLE
const GOOGLE_API_KEY = 'AIzaSyAzEzKmqoAYYeFV316y_Nez6sxwmef4yMg'

//YELP
const YELP_API_KEY = 'AIzaSyDgWXiufJeXhNVphSICthtCu6vIKl8LgM8'
const YELP_TOKEN =
  '6KAdo5lXD60wXHHwgjtwxX799FLuqB0OZmN4kyxXoVQEF-BVYO8cyZatEbLlWHKGQoxWymBGORewvPP2RHThT1Pr-G2WsvSsZ43XSNWRsVSgxObBO_qG3YTkPgJnZXYx'
const sdk = require('api')('@yelp-developers/v1.0#xtskmqwlofwyovu')
const sdkReviews = require('api')('@yelp-developers/v1.0#420462elwhqcl54')

// bbb
const bbb_token =
  'X-BfjJ0l6D6L7OE6CwGJZAcRCGGxIpQ1NH6aRhmhx01dPsx9509RlFKhJyU6nfBJBnW97T8aF1-PBBkouGKXOx3pn1UDVRYI-20y2Mbf0XjzdzR64iZC2dkh43TUZAwloEofI_HzzwqEhyLHHnYVm0Ms8YSimuz7VBDqHbS3LToIJ3HJgOXLP7OJBKEPuGtHlKHiKpKd3DG8al3uDAkSNDujZ7pV0xEPSDoRxQoqY_mHInET9Aq0eLnXRQhrKxOrsOA1T3EQbqLRypA46S_q9WuPBF47WndGiUdFDhHnChsNuuhhFOSnYT-_BxWmvEuHXcofvp0fZ3C_jO9eCaeVQ06JXybhtNgrmNeLAvFLX6zuQZemXYR8UXix0Obyq1Oxk1UwbaQL71wV9jYd4MoHYMyDToizrhQbzD4gYU5wt47Nv4j1_bx1DzKkTEMr5UP_kLRJDxSTkd2A3lUiH9e67Rwdvbss7-HtB5y_fPnBB-qEBZFwfiTlEKLLT91DoN9jELsmDtMjM97LnrBoFzjB3iM4niI7FbjTntUmo8h-yLViLSjHfnK64bNrKyZUSgY9dhbl3Eb4kPoarTkh86RPlxlKQKdOcT-zomoD0YMec4V1xkMEXmNiv-2EFjuyYj6c9HLn96u5HfQ5QSyqQMXThNIzk3g'

//error  422 handle...
error422 = (message, res) => {
  return res.status(422).json({
    status: 422,
    message: message
  })
}
//error 500 handle...
error500 = (message, res) => {
  return res.status(500).json({
    status: 500,
    error: 'Internal Server Error',
    message: message
  })
}
const googleBusinessSearch = async (req, res) => {
  const businessName = req.query.name
  if (!businessName) {
    return error422('Business name is required.', res)
  }
  const base_url =
    'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?'
  // fields: 'name,formatted_address,rating,place_id,photos,type,icon,icon_mask_base_uri,user_ratings_total,business_status,geometry,plus_code,price_level',
  const params = {
    input: businessName,
    inputtype: 'textquery',
    fields:
      'name,formatted_address,rating,place_id,photos,type,icon,icon_mask_base_uri,user_ratings_total,business_status,plus_code,price_level',
    key: GOOGLE_API_KEY
  }

  let response = await axios.get(base_url, { params })
  try {
    if (response.status === 200) {
      const data = response.data
      res.status(200).json({
        status: 200,
        message: 'Google business retrived successfully.',
        data: data.candidates
      })
    }
  } catch (error) {
    // console.error('Error:', error);
    res.status(500).json({ error: error })
  }
}
//get google review list by place id...
const googleBusinessSearchById = async (req, res) => {
  const placeId = req.query.placeId
  if (!placeId) {
    return error422('Place ID is required', res)
  }
  const base_url = 'https://maps.googleapis.com/maps/api/place/details/json?'
  const params = {
    place_id: placeId,
    fields:
      'name,formatted_address,rating,place_id,photos,type,icon,icon_mask_base_uri,user_ratings_total,business_status,geometry,plus_code,price_level,reviews',
    key: GOOGLE_API_KEY
  }

  try {
    const response = await axios.get(base_url, { params })
    if (response.status === 200) {
      const data = response.data
      if (data.result) {
        let reviewsList = []
        if (data.result.reviews) {
          reviewsList = data.result.reviews
        } else {
          reviewsList = []
        }
        return res.status(200).json({
          status: 200,
          message: 'Google review retrived successfully.',
          data: reviewsList,
          total:data.result.user_ratings_total,
          rating:data.result.rating
        })
      } else {
        return error422('Business not found', res)
      }
    } else {
      return error422('Failed to fetch data', res)
    }
  } catch (error) {
    return error500(error)
  }
}

//yelp business search
const yelpBusinessSearch = async (req, res) => {
  const location = req.query.location
  if (!location) {
    return error422('Location is required.', res)
  }

  try {
    sdk.auth(`Bearer ${YELP_TOKEN}`)
    sdk
      .v3_business_search({
        location: location,
        sort_by: 'best_match',
        limit: '21'
      })
      .then(
        ({ data }) => res.status(200).json(data)
        // if (data) {
        //     res.status(200).json({
        //         status:200,
        //         message:"Business data retrived successfully",
        //         data:{
        //             name:data.name
        //         }
        //     })
        // }
      )
      .catch(err => error500(err, res))
  } catch (error) {
    error500(err, res)
  }
}
//yelp business search phone
const yelpBusinessSearchByPhone = async (req, res) => {
  const phone = req.query.phone
  if (!phone) {
    return error422('Phone is required.', res)
  }
  const phonePattern = /^[0-9 +()-.x/]+$/
  if (!phonePattern.test(phone)) {
    return error422("'Phone number does not match the required pattern", res)
  }

  try {
    sdk.auth(`Bearer ${YELP_TOKEN}`)
    let result = await sdk.v3_business_phone_search({ phone: `${phone}` })
    return res.status(200).json({
      status: 200,
      message: 'Business data retrived successfully',
      data: result.data.businesses
    })
  } catch (error) {
    return error500(error, res)
  }
}
const yelpBusinessSearchByBusinessId = async (req, res) => {
  const businessId = req.query.businessId
  if (!businessId) {
    return error422('Business Id is required', res)
  }
  try {
    sdk.auth(`Bearer ${YELP_TOKEN}`)
    let result = await sdk.v3_business_info({
      business_id_or_alias: `${businessId}`
    })
    return res.status(200).json({
      status: 200,
      message: 'Business data retrived successfully',
      data: result.data
    })
  } catch (error) {
    if (error.status == 404) {
      return error422('Business could not be found', res)
    } else {
      return error500(error, res)
    }
  }
}

//get yelp business review by id
const yelpBusinessReviewById = async (req, res) => {
  //     yelpDevelopers.auth('Bearer 6KAdo5lXD60wXHHwgjtwxX799FLuqB0OZmN4kyxXoVQEF-BVYO8cyZatEbLlWHKGQoxWymBGORewvPP2RHThT1Pr-G2WsvSsZ43XSNWRsVSgxObBO_qG3YTkPgJnZXYx');
  // yelpDevelopers.v3_business_reviews({sort_by: 'yelp_sort', business_id_or_alias: '4kMBvIEWPxWkWKFN__8SxQ'})
  //   .then(({ data }) => console.log(data))
  //   .catch(err => console.error(err));
  const businessId = req.query.businessId
  if (!businessId) {
    return error422('Business Id is required', res)
  }
  try {
    sdkReviews.auth(`Bearer ${YELP_TOKEN}`)
    let result = await sdkReviews.v3_business_reviews({
      business_id_or_alias: `${businessId}`
    })
    sdk.auth(`Bearer ${YELP_TOKEN}`)
    let business_info = await sdk.v3_business_info({
        business_id_or_alias: `${businessId}`
      })
    if (result.data.reviews) {
      return res.status(200).json({
        status: 200,
        message: 'Business reviews retrived successfully',
        data: result.data.reviews,
        total: result.data.total,
        rating:business_info.data.rating
      })
    } else {
      return res.status(404).json({
        status: 404,
        message: 'Business reviews Not Found'
      })
    }
  } catch (error) {
    if (error.status == 404) {
      return error422('Business could not be found', res)
    } else {
      return error500(error, res)
    }
  }
}

const bbbBusinessSearch = async (req, res) => {
  const organizationName = req.query.organizationName
  const businessId = req.query.businessId

  if (organizationName || businessId) {
    const base_url = 'https://api.bbb.org/api/orgs/search?'
    const headers = { Authorization: `Bearer ${bbb_token}` } // auth header with bearer token

    let params // Declare params outside the if-else block

    if (organizationName) {
      params = {
        organizationName: organizationName
      }
    } else if (businessId) {
      params = {
        businessId: businessId
      }
    } else {
      return error422('Organization or Business is required.', res)
    }

    try {
      const response = await axios.get(base_url, { params, headers })
      if (response.status === 200) {
        const data = response.data
        return res.status(200).json({ data: data })
      } else {
        return res.status(500).json({ error: 'Failed to fetch data' })
      }
    } catch (error) {
      return res
        .status(error.response?.status || 500)
        .json({ error: 'Unauthorized' })
    }
  } else {
    return res.status(400).json({ error: 'Invalid input' })
  }
}

//review submit...
const reviewSubmit = async (req, res) =>{
  const business_id = req.body.business_id ? req.body.business_id : null;
  const platform_id = req.body.platform_id ? req.body.platform_id :null;
  const name = req.body.name ? req.body.name.trim() : null;
  const email_id = req.body.email_id ? req.body.email_id.trim() : null;
  const rating = req.body.rating ? req.body.rating : null;
  const comment = req.body.comment ? req.body.comment.trim():null;
  const imageBase64 = req.body.imageBase64 ? req.body.imageBase64 : null;
  const image_name =  req.body.image_name ? req.body.image_name : null;
  if (!business_id) {
    return error422("Business is required.", res)
  } else if (!platform_id) {
    return error422("Platform id is required.", res)
  } else if(!name){
    return error422("Name is required.", res)
  }
  let connection
  try {
    connection = await pool.connect();

    let conFileName = "";
    let conFilePath = "";
        if (image_name && imageBase64) {
            const timestamp = Date.now();
            const fileExtension = path.extname(image_name);
            conFileName = `${name}_${timestamp}${fileExtension}`;
            conFilePath = path.join(__dirname, "..", "..", "..", "images", "review_photo", conFileName);
            const decodedLogo = Buffer.from(imageBase64, "base64");
            fs.writeFileSync(conFilePath, decodedLogo);
        }
    //check is business id exist...
    const isBusinessIdExistQuery = "SELECT * FROM business WHERE business_id = $1 ";
    const isBusinessIdResult = await connection.query(isBusinessIdExistQuery,[business_id]);
    if(isBusinessIdResult.rowCount == 0){
      return res.status(400).json({
        status:400,
        message:"Business Not Found."
      })
    }
    //check is platform id exist...
    const isPlatformIdExistQuery = "SELECT * FROM platform WHERE platform_id = $1 ";
    const isPlatFormIdExistResult = await connection.query(isBusinessIdExistQuery,[platform_id])
    if (isPlatFormIdExistResult.rowCount == 0) {
      return res.status(400).json({
        status:400,
        message:"Platform Not Found."
      })
    }
    //insert into negative review table...
    const insertNegativeReviewQuery = "INSERT INTO negative_review (business_id, platform_id, name, email_id, rating, comment, upload_photo) VALUES ($1, $2, $3, $4, $5, $6, $7)"
    const insertNegativeReviewResult = await connection.query(insertNegativeReviewQuery, [business_id, platform_id, name, email_id, rating, comment, conFileName])
    return res.status(200).json({
      status:200,
      message:"Review submit successfully."
    })
  } catch (error) {
    return error500(error, res)
  } finally {
    if (connection) connection.release()
  }
}
//get negative review...
const getNegativeReviews = async (req, res) =>{
  const {page, perPage, key }= req.query;
  
  let connection;
  try {
      connection = await pool.connect();
      let query = "SELECT * FROM negative_review ";
      let countQuery = "SELECT COUNT(*) AS total FROM negative_review ";
      if (key) {
          const lowerCaseKey = key.toLowerCase().trim();
          if(key == 'activated'){
              query += " WHERE status = 1";
              countQuery += " WHERE status = 1";
          } else if(key=='deactivated'){
              query += " WHERE status = 0";
              countQuery += " WHERE status = 0";
          } else {
              query += ` WHERE LOWER(name) LIKE '%${lowerCaseKey}%'`;
              countQuery +=  ` WHERE LOWER(name) LIKE '%${lowerCaseKey}%'`;
          }
      } 

          query += " ORDER BY cts DESC";
          let total = 0;
          //apply pagination if both page and perPage are provided
          if (page && perPage) {
              const totalResult = await connection.query(countQuery);
              total = parseInt(totalResult.rows[0].total);
              const start = (page - 1) * perPage;
              query +=  ` LIMIT ${perPage} OFFSET ${start}`;
          }
          const result = await connection.query(query);
          const negative_review = result.rows;
          const data = {
              status:200,
              message:"Negative review retrieved successfully",
              data:negative_review
          };
          //Add pagination information if provided
          if (page & perPage) {
              data.pagination = {
                  per_page: perPage,
                  total:total,
                  current_page:page,
                  last_page: Math.ceil(total/perPage)
              };
          }
          return res.status(200).json(data);

  } catch (error) {
      return error500(error, res);
  } finally {
    if (connection) connection.release()
  }
}
// get negative review by id...
const getNegativeReview = async (req, res) => {
  const negativeReviewId = parseInt(req.params.id);
  if (!negativeReviewId) {
    return error422("Negative review id is required.", res);
  }
  try {
      const negativeReviewQuery = "SELECT * FROM negative_review WHERE review_id = $1";
      const negativeReviewResult = await pool.query(negativeReviewQuery, [negativeReviewId]);

      if (negativeReviewResult.rowCount === 0) {
          return res.status(404).json({
              status: 404,
              message: "Review not found.",
          });
      }

      const negativeResult = negativeReviewResult.rows[0];

      return res.status(200).json({
          status: 200,
          message: "Negative review retrieved successfully",
          data: negativeResult,
      });
  } catch (error) {
      return error500(error, res)
  }
};
module.exports = {
  yelpBusinessSearch,
  yelpBusinessSearchByPhone,
  yelpBusinessReviewById,
  googleBusinessSearch,
  googleBusinessSearchById,
  bbbBusinessSearch,
  yelpBusinessSearchByBusinessId,
  reviewSubmit,
  getNegativeReviews,
  getNegativeReview
}
