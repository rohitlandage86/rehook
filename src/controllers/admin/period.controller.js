const pool = require('../../../db')
// error 500 handler...
error500 = (error, res)=>{
    console.log(error);
    return res.status(500).json({
        status:500,
        message:"Internal Server Error",
        error:error
    })
}
const getPeriods = async (req, res) => {
    let connection
    try {
        connection = await pool.connect()
        let periodQuery = "SELECT * FROM period_master WHERE status=1 ";
        const periodResult = await connection.query(periodQuery);
        const periods = periodResult.rows;

        return res.status(200).json({
            status: 200,
            message: "Periods retrieved successfully.",
            data: periods
        });
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
};
module.exports = {
    getPeriods
}