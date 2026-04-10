const CustomField = require('../models/CustomField');

exports.getAll = async (req, res) => {
  try {
    const fields = await CustomField.find({}).sort({ order: 1 });
    res.json({ status: 'success', data: fields });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { label, type, key } = req.body;
    const fieldKey = key || label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Check if key already exists
    const existing = await CustomField.findOne({ key: fieldKey });
    if (existing) {
      return res.status(400).json({ status: 'error', message: `Field with key '${fieldKey}' already exists.` });
    }

    const field = await CustomField.create({
      key: fieldKey,
      label,
      type: type || 'text',
      order: (await CustomField.countDocuments()) + 1
    });
    
    res.status(201).json({ status: 'success', data: field });
  } catch (e) {
    res.status(400).json({ status: 'error', message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const field = await CustomField.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!field) return res.status(404).json({ status: 'error', message: 'Field not found' });
    res.json({ status: 'success', data: field });
  } catch (e) {
    res.status(400).json({ status: 'error', message: e.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const field = await CustomField.findByIdAndDelete(req.params.id);
    if (!field) return res.status(404).json({ status: 'error', message: 'Field not found' });
    res.json({ status: 'success', message: 'Field deleted successfully' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};
