// fe/src/pages/TargetListUpload.jsx
import { useState } from 'react';
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
} from 'antd';
import { InboxOutlined, DownloadOutlined, UploadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
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

  // Required columns for validation
  const requiredColumns = ['loan_id', 'customer_name', 'phone_number', 'amount', 'branch'];

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
    if (row.branch) {
      const branch = row.branch.toString().trim();
      if (branch.length < 2) {
        errors.push('Branch name is too short');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  };

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

        // ✅ Parse amounts and validate
        const validatedData = data.map((row) => {
          const parsedAmount = parseAmount(row.amount);
          const rowWithParsedAmount = {
            ...row,
            amount: parsedAmount,
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

    setIsUploading(true);

    try {
      const payload = {
        taskType,
        rows: validRowsData.map(row => ({
          loanId: row.loan_id,
          customerName: row.customer_name,
          phoneNumber: row.phone_number,
          amount: parseAmount(row.amount),
          branch: row.branch || '',
          loanOfficer: row.loan_officer || '',
          disbursementDate: row.disbursement_date || null,
          maturityDate: row.maturity_date || null,
        })),
      };

      console.log('📤 Upload payload:', payload);

      const response = await campaignApi.uploadTargetList(payload);

      if (response.data && response.data.success) {
        const { created, assigned, errors } = response.data;
        let successMsg = `${created} tasks created successfully`;
        if (assigned > 0) {
          successMsg += `, ${assigned} assigned to agents`;
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
        phone_number: '0999-123-4567',
        amount: '150000',
        branch: 'Yangon',
        loan_officer: 'Agent Smith',
        disbursement_date: '2026-09-01',
        maturity_date: '2026-12-01',
      },
      {
        loan_id: 'LN-2026-00002',
        customer_name: 'Jane Smith',
        phone_number: '0917-765-4321',
        amount: '25000',
        branch: 'Mandalay',
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
      dataIndex: 'branch',
      key: 'branch',
      width: 130,
      render: (branch) => branch || '-',
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
        <Tag color={record._valid ? 'success' : 'error'}>
          {record._valid ? 'Valid' : 'Error'}
        </Tag>
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

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Title level={2}>Target List Upload</Title>
      <Text type="secondary">
        Upload daily target files from your core banking system to generate verification tasks.
      </Text>

      <Divider />

      <Card style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>Step 1: Select Task Type</Title>
          <Radio.Group
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="DISBURSEMENT">Disbursement Verification</Radio.Button>
            <Radio.Button value="DEPOSIT">Deposit Verification</Radio.Button>
          </Radio.Group>
        </div>

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
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for .csv, .xlsx, .xls files. Max 5MB.
            </p>
          </Dragger>

          <Space style={{ marginTop: 8 }} wrap>
            <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
              Download Template
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              (Required: loan_id, customer_name, phone_number, amount, branch,loan_officer, disbursement_date, maturity_date)
            </Text>
            <Tooltip title="Loan ID format: LN-YYYY-XXXXX (e.g., LN-2026-00123)">
              <QuestionCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          </Space>
        </div>

        {uploadedData.length > 0 && (
          <>
            <Divider />
            <Title level={5}>Step 3: Preview & Validate</Title>

            <Alert
              message={
                <span>
                  <strong>{validRows}</strong> valid rows, <strong>{errorRows}</strong> errors found.
                  {errorRows > 0 && ' Please fix the errors before uploading.'}
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
      `}</style>
    </div>
  );
};

export default TargetListUpload;