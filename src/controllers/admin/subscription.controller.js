const pool = require("../../../db");
//error handler...
error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    });
};
//error 500 handler...
error500 = (error, res)=>{
    return res.status(500).json({
        status:500,
        message: "Internal servere"
    })
}

//create subscription...
const createSubscription = async (req, res) => {
    const subscription_name = req.body.subscription_name ? req.body.subscription_name.trim() : null;
    const description = req.body.description ? req.body.description.trim() : null;
    let subscription_details = req.body.subscription_details;
    // const untitled_id = req.companyData.agent_id;
    const untitled_id = 1;
    // Validate input data
    if (!subscription_name) {
        return error422("Subscription is required.", res);
    } else if (!subscription_details) {
        return error422("Monthly , Quarterly and Annually is required.", res);
    } else if (subscription_details.length <= 0) {
        return error422("Monthly , Quarterly and Annually is required.", res);
    }
    // Validate the elements in the subscription_details array
    for (const subscription of subscription_details) {
        if (typeof subscription !== 'object' || !('price' in subscription) || !('no_of_days' in subscription)) {
            return error422("Invalid subscription details.", res);
        }
        if (typeof subscription.price !== 'number' || typeof subscription.no_of_days !== 'number') {
            return error422("Invalid price or no_of_days values.", res);
        }
    }
    // Check if the subscription with the provided subscription name exists and is active
    const subscriptionQuery = "SELECT * FROM subscription_master_header WHERE TRIM(LOWER(subscription_name)) = $1";
    const subscriptionResult = await pool.query(subscriptionQuery, [subscription_name.toLowerCase()]);
    if (subscriptionResult.rowCount !== 0) {
        return error422("Subscription already exists.", res);
    }

    try {

        await pool.query("BEGIN");
        const insertQuery = "INSERT INTO subscription_master_header (subscription_name, description, untitled_id) VALUES ($1, $2, $3) RETURNING subscription_id";
        const insertValues = [subscription_name, description, untitled_id];
        const insertResult = await pool.query(insertQuery, insertValues);
        const subscription_id = insertResult.rows[0].subscription_id;
        for (const subscription of subscription_details) {
            let insertQuery = "INSERT INTO subscription_master_footer (subscription_id, price, period_id,no_of_days) VALUES ($1, $2, $3, $4)";
            let insertValues = [subscription_id, subscription.price, subscription.period_id, subscription.no_of_days];
            let subscriptionResult = await pool.query(insertQuery, insertValues);
        }
        await pool.query("COMMIT");
        return res.status(200).json({
            status: 200,
            message: "Subscription created successfully"
        });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: "Internal Server Error",
            error: error
        });
    }
};

// get subscriptions  list with pagination and search api...
const getSubscriptions = async (req, res) => {
    const { page, perPage, key } = req.query;

    try {
        let query = "SELECT * FROM subscription_master_header";
        let countQuery = "SELECT COUNT(*) AS total FROM subscription_master_header";
        // Check if 'key' parameter is provided
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (key === 'activated') {
                query += " WHERE status = 1";
                countQuery += " WHERE status = 1";
            } else if (key === 'deactivated') {
                query += " WHERE status = 0";
                countQuery += " WHERE status = 0";
            } else {
                query += ` WHERE LOWER(subscription_name) LIKE '%${lowercaseKey}%'  `;
                countQuery += ` WHERE LOWER(subscription_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        query += " ORDER BY created_at DESC";
        let total = 0;
        // Apply pagination if both page and perPage are provided
        if (page && perPage) {
            const totalResult = await pool.query(countQuery);
            total = parseInt(totalResult.rows[0].total);

            const start = (page - 1) * perPage;
            query += ` LIMIT ${perPage} OFFSET ${start}`;
        }


        const result = await pool.query(query);
        const subscriptions = result.rows;
        const data = {
            status: 200,
            message: "Subscriptions retrieved successfully",
            data: subscriptions
        };
        // Add pagination information if provided
        if (page && perPage) {
            data.pagination = {
                per_page: perPage,
                total: total,
                current_page: page,
                last_page: Math.ceil(total / perPage)
            };
        }
        return res.status(200).json(data);
    } catch (error) {
        const data = {
            status: 500,
            message: "Internal Server Error",
            error: error.message
        };
        return res.status(500).json(data);
    }
};

// get subscription by id...
const getSubscription = async (req, res) => {
    const subscriptionId = parseInt(req.params.id);
    try {   
        let query = `
            SELECT smh.subscription_id, smh.subscription_name, smh.description, smh.status,smh.created_at, smh.modify_at, smh.untitled_id,shf.price, shf.period_id, shf.no_of_days, pm.period
            FROM subscription_master_header smh
            LEFT JOIN subscription_master_footer shf ON smh.subscription_id = shf.subscription_id 
            LEFT JOIN period_master pm ON shf.period_id = pm.period_id
            WHERE smh.subscription_id= '${subscriptionId}'`;
        const result = await pool.query(query);

        const subscriptionsMap = new Map();

        result.rows.forEach((row) => {
            if (!subscriptionsMap.has(row.subscription_id)) {
                subscriptionsMap.set(row.subscription_id, {
                    subscription_id: row.subscription_id,
                    subscription_name: row.subscription_name,
                    description: row.description,
                    status: row.status,
                    created_at: row.created_at,
                    modify_at: row.modify_at,
                    untitled_id: row.untitled_id,
                    subscription_details: []
                });
            }

            subscriptionsMap.get(row.subscription_id).subscription_details.push({
                period_id: row.period_id,
                period: row.period,
                price: row.price,
                no_of_days: row.no_of_days
            });
        });

        const subscriptions = [...subscriptionsMap.values()];
        const data = {
            status: 200,
            message: "Subscriptions retrieved successfully",
            data: subscriptions[0]
        };
        return res.status(200).json(data);
    } catch (error) {
        const data = {
            status: 500,
            message: "Internal Server Error",
            error: error.message
        };
        return res.status(500).json(data);
    }
};
//update subscription...
const updateSubscription = async (req, res) => {
    const subscriptionId = parseInt(req.params.id);
    const subscription_name = req.body.subscription_name ? req.body.subscription_name.trim() : null;
    const description = req.body.description ? req.body.description.trim() : null;
    let subscription_details = req.body.subscription_details;

    // const untitled_id = req.companyData.agent_id;
    const untitled_id = 1
    // Validate input data
    if (!subscription_name) {
        return error422("Subscription is required.", res);
    }  else if (!subscription_details) {
        return error422("Monthly , Quarterly and Annually is required.", res);
    } else if (subscription_details.length <=0) {
        return error422("Monthly , Quarterly and Annually is required.", res);
    }
    // Validate the elements in the subscription_details array
    for (const subscription of subscription_details) {
        if (typeof subscription !== 'object' || !('price' in subscription) || !('no_of_days' in subscription)) {
            return error422("Invalid subscription details.", res);
        }
        if (typeof subscription.price !== 'number' || typeof subscription.no_of_days !== 'number') {
            return error422("Invalid price or no of days values.", res);
        }
    }

    // Check if subscription exists
    const subscriptionQuery = "SELECT * FROM subscription_master_header WHERE subscription_id = $1";
    const subscriptionResult = await pool.query(subscriptionQuery, [subscriptionId]);

    if (subscriptionResult.rowCount === 0) {
        return res.status(404).json({
            status: 404,
            message: "Subscription not found.",
        });
    }

    // Check if the provided subscription exists and is active
    const existingSubscriptionQuery = "SELECT * FROM subscription_master_header WHERE LOWER(subscription_name) = $1 AND subscription_id != $2";
    const existingSubscriptionResult = await pool.query(existingSubscriptionQuery, [subscription_name.toLowerCase(), subscriptionId]);
    if (existingSubscriptionResult.rowCount > 0) {
        return error422("Subscription already exists.", res);
    }

    try {

        const nowDate = new Date().toISOString().split('T')[0];
        // Update the subscription record with new data
        const updateQuery = `UPDATE subscription_master_header 
                    SET subscription_name = $1, description = $2,  untitled_id = $3, modify_at = $4
                    WHERE subscription_id = $5`;
        const updateValues = [subscription_name, description, untitled_id, nowDate, subscriptionId];
        const updateResult = await pool.query(updateQuery, updateValues);
        // Delete existing subscription_master_footer entries for the given subscription_id
        const deleteFooterQuery = "DELETE FROM subscription_master_footer WHERE subscription_id = $1";
        const deleteFooterValues = [subscriptionId];
        await pool.query(deleteFooterQuery, deleteFooterValues);

        // Insert new subscription_master_footer entries
        for (const subscription of subscription_details) {
            const insertFooterQuery = "INSERT INTO subscription_master_footer (subscription_id, price, period_id, no_of_days) VALUES ($1, $2, $3, $4)";
            const insertFooterValues = [subscriptionId, subscription.price, subscription.period_id, subscription.no_of_days];
            await pool.query(insertFooterQuery, insertFooterValues);
        }

        return res.status(200).json({
            status: 200,
            message: "Subscription updated successfully.",
        });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: "Internal Server Error",
            error: error
        });
    }
};

//status change of subscription...
const onStatusChange = async (req, res) => {
    const subscriptionId = parseInt(req.params.id);
    const status = parseInt(req.query.status);
    try {
        // Check if the Subscription exists
        const subscriptionQuery = "SELECT * FROM subscription_master_header WHERE subscription_id = $1";
        const subscriptionResult = await pool.query(subscriptionQuery, [subscriptionId]);

        if (subscriptionResult.rowCount === 0) {
            return res.status(404).json({
                status: 404,
                message: "Subscription not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the Subscription status
        const updateQuery = `
            UPDATE subscription_master_header
            SET status = $2
            WHERE subscription_id = $1
        `;

        await pool.query(updateQuery, [subscriptionId, status]);

        const statusMessage = status === 1 ? "activated" : "deactivated";

        return res.status(200).json({
            status: 200,
            message: `Subscription ${statusMessage} successfully.`,
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            status: 500,
            message: "Internal Server Error",
            error: error
        });
    }
};
//get subscription active...
const getSubscriptionWma = async (req, res) => {
    try {
        let query = `
            SELECT smh.subscription_id, smh.subscription_name, smh.description, smh.status,smh.created_at, smh.modify_at, smh.untitled_id,shf.price, shf.period_id, shf.no_of_days
            FROM subscription_master_header smh
            LEFT JOIN subscription_master_footer shf ON smh.subscription_id = shf.subscription_id`;

        query += " ORDER BY smh.created_at DESC";
        const result = await pool.query(query);
        const subscriptionsMap = new Map();
        result.rows.forEach((row) => {
            if (!subscriptionsMap.has(row.subscription_id)) {
                subscriptionsMap.set(row.subscription_id, {
                    subscription_id: row.subscription_id,
                    subscription_name: row.subscription_name,
                    description: row.description,
                    status: row.status,
                    created_at: row.created_at,
                    modify_at: row.modify_at,
                    untitled_id: row.untitled_id,
                    subscription_details: []
                });
            }
            subscriptionsMap.get(row.subscription_id).subscription_details.push({
                period_id: row.period_id,
                price: row.price,
                no_of_days: row.no_of_days
            });
        });

        const subscriptions = [...subscriptionsMap.values()];

        const data = {
            status: 200,
            message: "Subscriptions retrieved successfully",
            data: subscriptions
        };
        return res.status(200).json(data);
    } catch (error) {
        const data = {
            status: 500,
            message: "Internal Server Error",
            error: error.message
        };
        return res.status(500).json(data);
    }
}
module.exports = {
    createSubscription,
    getSubscriptions,
    getSubscription,
    updateSubscription,
    onStatusChange,
    getSubscriptionWma
}