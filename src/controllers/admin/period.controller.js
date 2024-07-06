const pool = require('../../../db')
const getPeriods = async (req, res) => {
    let periodQuery = "SELECT * FROM period_master WHERE status=1 ";

    try {
        const periodResult = await pool.query(periodQuery);
        const periods = periodResult.rows;

        return res.status(200).json({
            status: 200,
            message: "Periods retrieved successfully.",
            data: periods
        });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: "Internal Server Error",
            error: error, 
        });
    }
};
module.exports = {
    getPeriods
}