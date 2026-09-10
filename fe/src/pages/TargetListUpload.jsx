// fe/src/pages/TargetListUpload.jsx
import { useState, useEffect } from 'react';
import {
  Card,
  Radio,
  Upload,
  Button,
  Table,
  Alert,
  Space,
  Typography,
  message,
  Divider,
  Tag,
  Tooltip,
  Select,
  Checkbox,
  Row,
  Col,
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  UploadOutlined,
  QuestionCircleOutlined,
  CalendarOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { campaignApi } from '../api/campaignApi';
import { formatCurrency } from '../config/currency';
import { parseAmount } from '../utils/amountParser';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const TargetListUpload = () => {
  const [taskType, setTaskType] = useState('DISBURSEMENT');
  const [uploadedData, setUploadedData] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [validRows, setValidRows] = useState(0);
  const [errorRows, setErrorRows] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

   // Campaign assignment states
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState('none'); // 'manual' | 'auto' | 'none'
  const [autoAssignChecked, setAutoAssignChecked] = useState(false);
  // Required columns for validation
  const requiredColumns = ['loan_id', 'customer_name', 'phone_number', 'amount', 'branch_id'];

  const validateRow = (row) => {
    const errors = [];

    requiredColumns.forEach((col) => {
      if (!row[col] || row[col].toString().trim() === '') {
        errors.push(`${col.replace('_', ' ')} is required`);
      }
    });

    // ✅ Strict loan_id validation
    if (row.loan_id) {
      const loanId = row.loan_id.toString().trim();

      // Format: LN-YYYY-XXXXX (e.g., LN-2026-00123)
      const isValidFormat = /^LN-\d{4}-\d{5}$/.test(loanId);

      // Alternative: Alphanumeric with hyphens (3-30 chars)
      const isFlexibleFormat = /^[A-Z0-9-]{3,30}$/.test(loanId);

      // Check if it's just numbers or too simple
      const isTooSimple = /^\d+$/.test(loanId) && loanId.length < 8;

      if (!isValidFormat && !isFlexibleFormat) {
        errors.push('Invalid loan_id format. Expected: LN-YYYY-XXXXX (e.g., LN-2026-00123)');
      } else if (isTooSimple) {
        errors.push('Loan ID is too simple. Expected format: LN-YYYY-XXXXX');
      } else if (loanId.length < 5) {
        errors.push('Loan ID is too short. Must be at least 5 characters.');
      }
    }

    // ✅ Use parseAmount for validation
    if (row.amount) {
      const amount = parseAmount(row.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push('Amount must be a positive number');
      }
      if (amount > 999999999) {
        errors.push('Amount seems too large (> 999,999,999)');
      }
    }

    // Validate phone number
    if (row.phone_number) {
      const phone = row.phone_number.toString().trim();
      if (phone.length < 9) {
        errors.push('Phone number is incorrect');
      }
      if (!/^[\d+\-\s()]+$/.test(phone)) {
        errors.push('Phone number contains invalid characters');
      }
    }

    // Validate branch
    if (row.branch_id) {
      const branch = row.branch_id.toString().trim();
      if (branch.length < 2) {
        errors.push('Branch name is too short');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  };

  // Fetch active campaigns for dropdown
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await campaignApi.getCampaigns({ status: 'ACTIVE' });
        setCampaigns(response.data || []);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };
    fetchCampaigns();
  }, []);

  const handleFileUpload = (file) => {
    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let data = [];
        const fileType = file.name.split('.').pop().toLowerCase();

        if (fileType === 'csv') {
          const csvData = e.target.result;
          const workbook = XLSX.read(csvData, { type: 'string' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(firstSheet);
        } else if (fileType === 'xlsx' || fileType === 'xls') {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(firstSheet);
        } else {
          message.error('Unsupported file format. Please upload .csv, .xlsx, or .xls');
          setIsUploading(false);
          return;
        }

        if (data.length === 0) {
          message.warning('The file appears to be empty.');
          setIsUploading(false);
          return;
        }

        const headers = Object.keys(data[0]);
        const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

        if (missingColumns.length > 0) {
          message.error(`Missing required columns: ${missingColumns.join(', ')}`);
          setIsUploading(false);
          return;
        }

        // Add this helper function at the top
        const parseDateString = (dateStr) => {
          if (!dateStr) return null;

          // If it's already a date object or null
          if (dateStr instanceof Date) return dateStr;

          // Convert DD-MM-YYYY to YYYY-MM-DD
          const parts = dateStr.toString().split('-');
          if (parts.length === 3) {
            // Check if it looks like DD-MM-YYYY
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);

            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              // If year is 2 digits, convert to 4 digits
              const fullYear = year < 100 ? 2000 + year : year;
              // Return as YYYY-MM-DD
              return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
          }

          // If it's already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
          }

          // Try to parse with Date
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }

          console.warn(`⚠️ Unable to parse date: ${dateStr}`);
          return dateStr;
        };

        // ✅ Parse amounts and validate
        const validatedData = data.map((row) => {
          const parsedAmount = parseAmount(row.amount);
          const rowWithParsedAmount = {
            ...row,
            amount: parsedAmount,
            // Convert dates to proper format
            disbursement_date: parseDateString(row.disbursement_date),
            maturity_date: parseDateString(row.maturity_date),
          };
          const validation = validateRow(rowWithParsedAmount);
          return {
            ...rowWithParsedAmount,
            _valid: validation.valid,
            _errors: validation.errors,
          };
        });

        const validCount = validatedData.filter((row) => row._valid).length;
        const errorCount = validatedData.length - validCount;

        setUploadedData(validatedData);
        setValidRows(validCount);
        setErrorRows(errorCount);
        setFileList([file]);

        if (errorCount === 0) {
          message.success(`All ${validCount} rows are valid and ready to upload!`);
        } else {
          message.warning(`${validCount} valid rows, ${errorCount} rows have errors.`);
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        message.error('Failed to parse the file. Please check the format.');
      }
      setIsUploading(false);
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    return false;
  };

  const handleUploadAndAssign = async () => {
    const validRowsData = uploadedData.filter((row) => row._valid);

    if (validRowsData.length === 0) {
      message.warning('No valid rows to upload.');
      return;
    }

    // Check assignment mode
    if (assignmentMode === 'manual' && !selectedCampaign) {
      message.warning('Please select a campaign or choose auto-assign.');
      return;
    }

    setIsUploading(true);

    try {
      const payload = {
        taskType,
        rows: validRowsData.map((row) => ({
          loanId: row.loan_id,
          customerName: row.customer_name,
          phoneNumber: row.phone_number,
          amount: parseAmount(row.amount),
          branchId: row.branch_id || row.branch || '',
          loanOfficer: row.loan_officer || '',
          disbursementDate: row.disbursement_date || null,
          maturityDate: row.maturity_date || null,
        })),
         // Campaign assignment config
        campaignAssignment: {
          mode: assignmentMode, // 'manual' | 'auto' | 'none'
          campaignId: assignmentMode === 'manual' ? selectedCampaign : null,
        },
      };

      console.log('📤 Upload payload:', JSON.stringify(payload, null, 2));

      const response = await campaignApi.uploadTargetList(payload);

      if (response.data && response.data.success) {
        const { created, assigned, errors, campaignAssigned } = response.data;
        let successMsg = `${created} tasks created successfully`;
        if (assigned > 0) {
          successMsg += `, ${assigned} assigned to agents`;
        }
        if (campaignAssigned) {
          successMsg += `, assigned to campaign`;
        }
        if (errors && errors.length > 0) {
          message.warning(successMsg + `. ${errors.length} errors encountered.`);
          console.warn('Upload errors:', errors);
        } else {
          message.success(successMsg);
        }
      } else {
        throw new Error(response.data?.error || 'Upload failed');
      }

      // Reset the form
      setUploadedData([]);
      setFileList([]);
      setValidRows(0);
      setErrorRows(0);
       setSelectedCampaign(null);
      setAssignmentMode('none');
      setAutoAssignChecked(false);
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error details:', error.response?.data);

      const errorMsg = error.response?.data?.error || error.message || 'Failed to upload tasks';
      message.error(`Upload failed: ${errorMsg}`);
      if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        console.error('Detailed errors:', error.response.data.errors);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        loan_id: 'LN-2026-00001',
        customer_name: 'John Doe',
        phone_number: '09991234567',
        amount: '150000',
        branch_id: 'br01',
        loan_officer: 'Agent Smith',
        disbursement_date: '2026-09-01',
        maturity_date: '2026-12-01',
      },
      {
        loan_id: 'LN-2026-00002',
        customer_name: 'Jane Smith',
        phone_number: '09177654321',
        amount: '25000',
        branch_id: 'br03',
        loan_officer: 'Agent Johnson',
        disbursement_date: '2026-09-02',
        maturity_date: '2026-12-02',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    ws['!cols'] = [
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, 'happy_call_template.xlsx');
  };

  const previewColumns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Loan ID',
      dataIndex: 'loan_id',
      key: 'loan_id',
      width: 160,
      render: (value) => {
        const loanId = value?.toString().trim() || '';
        const isValid = /^LN-\d{4}-\d{5}$/.test(loanId);
        return (
          <span style={{ color: isValid ? 'inherit' : '#ff4d4f' }}>
            {loanId || '-'}
            {!isValid && loanId && ' ⚠️'}
          </span>
        );
      },
    },
    {
      title: 'Customer Name',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 180,
    },
    {
      title: 'Phone Number',
      dataIndex: 'phone_number',
      key: 'phone_number',
      width: 140,
    },
    {
      title: 'Branch',
      dataIndex: 'branch_id',
      key: 'branch_id',
      width: 130,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (amount) => {
        const num = parseAmount(amount);
        if (num <= 0) return <span style={{ color: '#ff4d4f' }}>Invalid</span>;
        return <span style={{ fontWeight: 500 }}>{formatCurrency(num)}</span>;
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Tag color={record._valid ? 'success' : 'error'}>{record._valid ? 'Valid' : 'Error'}</Tag>
      ),
    },
    {
      title: 'Errors',
      dataIndex: '_errors',
      key: 'errors',
      width: 250,
      render: (errors) => (
        <Text type="danger" style={{ fontSize: 12 }}>
          {errors && errors.length > 0 ? errors.join('; ') : '✓'}
        </Text>
      ),
    },
  ];

  
  // Handle assignment mode changes
  const handleManualSelect = (value) => {
    setSelectedCampaign(value);
    setAssignmentMode('manual');
    setAutoAssignChecked(false);
  };

  const handleAutoAssignToggle = (e) => {
    const checked = e.target.checked;
    setAutoAssignChecked(checked);
    if (checked) {
      setAssignmentMode('auto');
      setSelectedCampaign(null);
    } else {
      setAssignmentMode('none');
    }
  };


  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }}>
      <Title level={2}>Loan Data Upload</Title>
      <Text type="secondary">
        Upload daily loan client files from your core banking system to generate verification tasks.
      </Text>

      <Divider />

      <Card style={{ marginTop: 24 }}>
        {/* Step 1 & Campaign Assignment - Side by Side */}
        <Row gutter={[32, 16]}>
          <Col xs={24} md={12}>
            <Title level={5}>Step 1: Select Task Type</Title>
            <Radio.Group
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="DISBURSEMENT">Disbursement Verification</Radio.Button>
              <Radio.Button value="DEPOSIT">Deposit Verification</Radio.Button>
            </Radio.Group>
          </Col>
          <Col xs={24} md={12}>
            <Card 
              size="small" 
              style={{ background: '#fafafa', border: '1px dashed #d9d9d9' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Title level={5} style={{ marginBottom: 8 }}>
                  <FolderOutlined /> Campaign Assignment
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    (Optional)
                  </Text>
                </Title>
                
                <Space direction="vertical" style={{ width: '100%' }}>
                  {/* Manual Selection */}
                  <div>
                    <Select
                      placeholder="Select campaign manually"
                      style={{ width: '100%' }}
                      onChange={handleManualSelect}
                      value={selectedCampaign}
                      disabled={autoAssignChecked}
                      allowClear
                    >
                      {campaigns.map((campaign) => (
                        <Option key={campaign.id} value={campaign.id}>
                          {campaign.name} ({campaign.type})
                        </Option>
                      ))}
                    </Select>
                    {selectedCampaign && (
                      <Text type="success" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                        ✅ Manual campaign selected
                      </Text>
                    )}
                  </div>

                  <Divider style={{ margin: '8px 0' }}>OR</Divider>

                  {/* Auto Assign */}
                  <Checkbox
                    checked={autoAssignChecked}
                    onChange={handleAutoAssignToggle}
                    disabled={!!selectedCampaign}
                  >
                    <CalendarOutlined /> Auto-assign by disbursement date
                  </Checkbox>
                  {autoAssignChecked && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginLeft: 24 }}>
                      Loans will be automatically assigned to the active campaign 
                      for their disbursement month and type.
                    </Text>
                  )}

                  {!selectedCampaign && !autoAssignChecked && (
                    <Text type="warning" style={{ fontSize: 12, display: 'block' }}>
                      ⚠️ Loans will be created without campaign association
                    </Text>
                  )}
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* Step 2: Upload File */}
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>Step 2: Upload File</Title>
          <Dragger
            multiple={false}
            fileList={fileList}
            beforeUpload={handleFileUpload}
            accept=".csv,.xlsx,.xls"
            disabled={isUploading}
            onRemove={() => {
              setUploadedData([]);
              setFileList([]);
              setValidRows(0);
              setErrorRows(0);
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">Support for .csv, .xlsx, .xls files. Max 5MB.</p>
          </Dragger>

          <Space style={{ marginTop: 8 }} wrap>
            <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
              Download Template
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              (Required: loan_id, customer_name, phone_number, amount, branch_id)
            </Text>
            <Tooltip title="Loan ID format: LN-YYYY-XXXXX (e.g., LN-2026-00123)">
              <QuestionCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          </Space>
        </div>

        {/* Step 3: Preview & Validate */}
        {uploadedData.length > 0 && (
          <>
            <Divider />
            <Title level={5}>Step 3: Preview & Validate</Title>

            <Alert
              message={
                <span>
                  <strong>{validRows}</strong> valid rows, <strong>{errorRows}</strong> errors found.
                  {errorRows > 0 && ' Please fix the errors before uploading.'}
                  {validRows > 0 && (
                    <span style={{ marginLeft: 16 }}>
                      {selectedCampaign ? (
                        <Tag color="blue">Manual Campaign: {campaigns.find(c => c.id === selectedCampaign)?.name}</Tag>
                      ) : autoAssignChecked ? (
                        <Tag color="green">Auto-assign by date enabled</Tag>
                      ) : (
                        <Tag color="orange">No campaign selected</Tag>
                      )}
                    </span>
                  )}
                </span>
              }
              type={errorRows === 0 ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              columns={previewColumns}
              dataSource={uploadedData}
              rowKey={(record, index) => index}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: 1100 }}
              rowClassName={(record) => (record._valid ? '' : 'ant-table-row-error')}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 16 }}>
              <Button
                onClick={() => {
                  setUploadedData([]);
                  setFileList([]);
                  setValidRows(0);
                  setErrorRows(0);
                  setSelectedCampaign(null);
                  setAssignmentMode('none');
                  setAutoAssignChecked(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={handleUploadAndAssign}
                disabled={validRows === 0}
                loading={isUploading}
              >
                Upload & Assign ({validRows} rows)
              </Button>
            </div>
          </>
        )}
      </Card>

      <style>{`
        .ant-table-row-error {
          background-color: #fff1f0 !important;
        }
        .ant-card-small > .ant-card-body {
          padding: 16px;
        }
      `}</style>
    </div>
  );
};

export default TargetListUpload;
