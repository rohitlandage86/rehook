const pool = require("../../../db");
const axios = require('axios');
//GOOGLE
const GOOGLE_API_KEY = 'AIzaSyAzEzKmqoAYYeFV316y_Nez6sxwmef4yMg';

//YELP
const YELP_API_KEY = 'AIzaSyDgWXiufJeXhNVphSICthtCu6vIKl8LgM8';
const YELP_TOKEN = '6KAdo5lXD60wXHHwgjtwxX799FLuqB0OZmN4kyxXoVQEF-BVYO8cyZatEbLlWHKGQoxWymBGORewvPP2RHThT1Pr-G2WsvSsZ43XSNWRsVSgxObBO_qG3YTkPgJnZXYx'
const sdk = require('api')('@yelp-developers/v1.0#xtskmqwlofwyovu');

// bbb 
const bbb_token = 'X-BfjJ0l6D6L7OE6CwGJZAcRCGGxIpQ1NH6aRhmhx01dPsx9509RlFKhJyU6nfBJBnW97T8aF1-PBBkouGKXOx3pn1UDVRYI-20y2Mbf0XjzdzR64iZC2dkh43TUZAwloEofI_HzzwqEhyLHHnYVm0Ms8YSimuz7VBDqHbS3LToIJ3HJgOXLP7OJBKEPuGtHlKHiKpKd3DG8al3uDAkSNDujZ7pV0xEPSDoRxQoqY_mHInET9Aq0eLnXRQhrKxOrsOA1T3EQbqLRypA46S_q9WuPBF47WndGiUdFDhHnChsNuuhhFOSnYT-_BxWmvEuHXcofvp0fZ3C_jO9eCaeVQ06JXybhtNgrmNeLAvFLX6zuQZemXYR8UXix0Obyq1Oxk1UwbaQL71wV9jYd4MoHYMyDToizrhQbzD4gYU5wt47Nv4j1_bx1DzKkTEMr5UP_kLRJDxSTkd2A3lUiH9e67Rwdvbss7-HtB5y_fPnBB-qEBZFwfiTlEKLLT91DoN9jELsmDtMjM97LnrBoFzjB3iM4niI7FbjTntUmo8h-yLViLSjHfnK64bNrKyZUSgY9dhbl3Eb4kPoarTkh86RPlxlKQKdOcT-zomoD0YMec4V1xkMEXmNiv-2EFjuyYj6c9HLn96u5HfQ5QSyqQMXThNIzk3g';

//error  422 handle...
error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    });
};
//error 500 handle...
error500 = (message, res) => {
    return res.status(500).json({
        status: 500,
        error: "Internal Server Error",
        message: message
    });
};
const googleBusinessSearch = async (req, res) => {
    const businessName = req.query.name;
    if (!businessName) {
        return error422("Business name is required.", res)
    }
    const base_url = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?';
    // fields: 'name,formatted_address,rating,place_id,photos,type,icon,icon_mask_base_uri,user_ratings_total,business_status,geometry,plus_code,price_level',
    const params = {
        input: businessName,
        inputtype: 'textquery',
        fields: 'name,formatted_address,rating,place_id,photos,type,icon,icon_mask_base_uri,user_ratings_total,business_status,plus_code,price_level',
        key: GOOGLE_API_KEY
    };

    let response = await axios.get(base_url, { params });
    try {
        if (response.status === 200) {
            const data = response.data;
            res.status(200).json({
                status: 200,
                message: "Google business retrived successfully.",
                data: data.candidates,
            });
        }
    } catch (error) {
        // console.error('Error:', error);
        res.status(500).json({ error: error });
    }
};

const googleBusinessSearchById = async (req, res) => {
    const placeId = req.query.placeId;
    if (!placeId) {
        return error422("Place ID is required", res)
    }
    const base_url = 'https://maps.googleapis.com/maps/api/place/details/json?';
    const params = {
        place_id: placeId,
        fields: 'name,formatted_address,rating,place_id,photos,type,icon,icon_mask_base_uri,user_ratings_total,business_status,geometry,plus_code,price_level,reviews',
        key: GOOGLE_API_KEY
    };

    try {
        const response = await axios.get(base_url, { params });
        if (response.status === 200) {
            const data = response.data;
            if (data.result) {
                let reviewsList = [];
                if (data.result.reviews) {
                    reviewsList = data.result.reviews
                } else {
                    reviewsList = []
                }
                return res.status(200).json({
                    status: 200,
                    message: "Google review retrived successfully.",
                    data: reviewsList,
                });
            } else {
                return error422("Business not found", res)
            }
        } else {
            return error422("Failed to fetch data", res)
        }
    } catch (error) {
        return error500(error);
    }
};

//yelp business search
const yelpBusinessSearch = async (req, res) => {
    const location = req.query.location;
    if (!location) {
        return error422("Location is required.", res);
    }

    try {
        sdk.auth(`Bearer ${YELP_TOKEN}`);
        sdk.v3_business_search({ location: location, sort_by: 'best_match', limit: '21' })
            .then(({ data }) => 
                res.status(200).json(data)
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
            .catch(err => error500(err, res));

    } catch (error) {
        error500(err, res);
    }

};
//yelp business search phone
const yelpBusinessSearchByPhone = async (req, res) => {
    const phone = req.query.phone;
    if (!phone) {
        return error422("Phone is required.", res);
    }

    try {
        sdk.auth(`Bearer ${YELP_TOKEN}`);
       let result= await sdk.v3_business_phone_search({ phone: `${phone}` })
       return res.status(200).json(result)

            // .then(({ data }) =>
            //     res.status(200).json(data))
            // .catch(err => res.status(422).json({ error: err }));
    } catch (error) {
        return error500(error, res);
    }

};
const yelpBusinessSearchByBusinessId = async (req, res) => {
    const businessId = req.query.businessId;
    if (!businessId) {
        return error422("Business Id is required", res);
    }
    try {
        sdk.auth(`Bearer ${YELP_TOKEN}`);
        sdk.v3_business_info({ business_id_or_alias: `${businessId}` })
            .then(({ data }) =>
                res.status(200).json(data))
            .catch(err => res.status(422).json({ error: err }));
    } catch (error) {
        return error500(error, res);
    }
};

const bbbBusinessSearch = async (req, res) => {
    const organizationName = req.query.organizationName;
    const businessId = req.query.businessId;

    if (organizationName || businessId) {
        const base_url = 'https://api.bbb.org/api/orgs/search?';
        const headers = { 'Authorization': `Bearer ${bbb_token}` }; // auth header with bearer token

        let params; // Declare params outside the if-else block

        if (organizationName) {
            params = {
                organizationName: organizationName,

            };
        } else if (businessId) {
            params = {
                businessId: businessId,
            };
        } else {
            return error422("Organization or Business is required.", res);
        }

        try {
            const response = await axios.get(base_url, { params, headers });
            if (response.status === 200) {
                const data = response.data;
                return res.status(200).json({ data: data });
            } else {
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
        } catch (error) {
            return res.status(error.response?.status || 500).json({ error: 'Unauthorized' });
        }
    } else {
        return res.status(400).json({ error: 'Invalid input' });
    }
};


module.exports = {
    yelpBusinessSearch,
    yelpBusinessSearchByPhone,
    googleBusinessSearch,
    googleBusinessSearchById,
    bbbBusinessSearch,
    yelpBusinessSearchByBusinessId,

}
