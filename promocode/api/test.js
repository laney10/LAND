module.exports = (req, res) => {
  res.status(200).json({
    success: true,
    message: "API 工作正常",
    timestamp: new Date().toISOString()
  });
};
