// fe/src/components/CallExecutionDrawer.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Descriptions,
  Radio,
  Button,
  Select,
  Input,
  Space,
  Typography,
  Divider,
  Tag,
  Alert,
  Form,
  message,
  Badge,
} from 'antd';
import {
  PhoneOutlined,
  CopyOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { pbxApi } from '../api/pbxApi';
import { socketService } from '../services/socket';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CallExecutionDrawer = ({ open, task, onClose, onSave }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [callState, setCallState] = useState({
    method: 'CLICK_TO_CALL',
    result: null,
    status: 'idle', // idle | dialing | ringing | connected | ended | failed
    pbxConnected: false,
    callId: null,
    duration: 0,
    callStartTime: null,
    callEndTime: null,
    isCallActive: false,
  });

  const [callTimer, setCallTimer] = useState(0);
  const timerInterval = useRef(null);
  const [callStatusMessages, setCallStatusMessages] = useState([]);
  const mountedRef = useRef(true);

  const { method, result, status, pbxConnected, callId, duration, isCallActive } = callState;

  // ============ STATUS COLORS ============
  const statusColors = {
    PENDING: 'default',
    ASSIGNED: 'blue',
    IN_PROGRESS: 'orange',
    CONFIRMED: 'green',
    DISPUTED: 'red',
    NO_CONTACT: 'gold',
    ESCALATED: 'magenta',
    CLOSED: 'default',
  };

  // ============ SOCKET EVENT HANDLERS ============
  useEffect(() => {
    if (!open || !task) return;

    // Connect socket if not already
    socketService.connect();

    // ============ PBX STATUS ============
    const handlePBXStatus = (data) => {
      if (!mountedRef.current) return;
      setCallState((prev) => ({
        ...prev,
        pbxConnected: data.connected || false,
      }));

      if (!data.connected) {
        message.warning('PBX is not connected. Please use Manual Dial.');
      }
    };

    // ============ CALL EVENTS ============
    const handleCallStarted = (data) => {
      if (!mountedRef.current) return;
      if (data.taskId === task.id) {
        console.log('📞 Call started for this task:', data);
        setCallState((prev) => ({
          ...prev,
          status: 'dialing',
          callId: data.callId,
          callStartTime: new Date(),
        }));
        setCallStatusMessages((prev) => [
          ...prev,
          {
            time: new Date(),
            message: '📞 Initiating call...',
            type: 'info',
          },
        ]);
      }
    };

    const handleCallRinging = (data) => {
      if (!mountedRef.current) return;
      if (data.taskId === task.id) {
        console.log('📞 Call ringing for this task:', data);
        setCallState((prev) => ({
          ...prev,
          status: 'ringing',
        }));
        setCallStatusMessages((prev) => [
          ...prev,
          {
            time: new Date(),
            message: '🔔 Ringing... Customer phone is ringing',
            type: 'info',
          },
        ]);
      }
    };

    const handleCallConnected = (data) => {
      if (!mountedRef.current) return;
      if (data.taskId === task.id) {
        console.log('📞 Call connected for this task:', data);
        setCallState((prev) => ({
          ...prev,
          status: 'connected',
          isCallActive: true,
          callStartTime: new Date(),
          duration: 0,
        }));
        setCallTimer(0);
        setCallStatusMessages((prev) => [
          ...prev,
          {
            time: new Date(),
            message: '🟢 Call connected! Customer is on the line.',
            type: 'success',
          },
        ]);
        message.success('Call connected!');
      }
    };

    const handleCallEnded = (data) => {
      if (!mountedRef.current) return;
      if (data.taskId === task.id) {
        console.log('📞 Call ended for this task:', data);
        setCallState((prev) => ({
          ...prev,
          status: 'ended',
          isCallActive: false,
          duration: data.duration || prev.duration,
          callEndTime: new Date(),
        }));
        setCallStatusMessages((prev) => [
          ...prev,
          {
            time: new Date(),
            message: `⏹️ Call ended. Duration: ${formatDuration(data.duration || 0)}`,
            type: 'info',
          },
        ]);
        message.info(`Call ended after ${data.duration || 0}s`);
        stopCallTimer();
      }
    };

    const handleCallFailed = (data) => {
      if (!mountedRef.current) return;
      if (data.taskId === task.id) {
        console.log('❌ Call failed for this task:', data);
        setCallState((prev) => ({
          ...prev,
          status: 'failed',
          isCallActive: false,
        }));
        setCallStatusMessages((prev) => [
          ...prev,
          {
            time: new Date(),
            message: `❌ Call failed: ${data.reason || 'Unknown error'}`,
            type: 'error',
          },
        ]);
        message.error(`Call failed: ${data.reason || 'Unknown error'}`);
        stopCallTimer();
      }
    };

    const handleCallError = (data) => {
      if (!mountedRef.current) return;
      if (data.taskId === task.id) {
        console.error('❌ Call error for this task:', data);
        setCallState((prev) => ({
          ...prev,
          status: 'failed',
          isCallActive: false,
        }));
        setCallStatusMessages((prev) => [
          ...prev,
          {
            time: new Date(),
            message: `❌ Error: ${data.message || 'Unknown error'}`,
            type: 'error',
          },
        ]);
        message.error(`Call error: ${data.message || 'Unknown error'}`);
        stopCallTimer();
      }
    };

    // ============ REGISTER LISTENERS ============
    socketService.on('pbx:status', handlePBXStatus);
    socketService.on('call:started', handleCallStarted);
    socketService.on('call:ringing', handleCallRinging);
    socketService.on('call:connected', handleCallConnected);
    socketService.on('call:ended', handleCallEnded);
    socketService.on('call:failed', handleCallFailed);
    socketService.on('call:error', handleCallError);

    // Get initial PBX status
    socketService.getPBXStatus();

    // ============ CLEANUP ============
    return () => {
      mountedRef.current = false;
      socketService.off('pbx:status', handlePBXStatus);
      socketService.off('call:started', handleCallStarted);
      socketService.off('call:ringing', handleCallRinging);
      socketService.off('call:connected', handleCallConnected);
      socketService.off('call:ended', handleCallEnded);
      socketService.off('call:failed', handleCallFailed);
      socketService.off('call:error', handleCallError);
      stopCallTimer();
    };
  }, [open, task]);

  // ============ CALL TIMER ============
  useEffect(() => {
    if (isCallActive) {
      startCallTimer();
    } else {
      stopCallTimer();
    }
    return () => stopCallTimer();
  }, [isCallActive]);

  const startCallTimer = () => {
    if (timerInterval.current) return;
    timerInterval.current = setInterval(() => {
      setCallTimer((prev) => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  // ============ FORMAT DURATION ============
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ============ EXECUTE CLICK-TO-CALL ============
  const executeClickToCall = async () => {
    if (!pbxConnected) {
      message.error('PBX is not connected. Please use Manual Dial.');
      return;
    }

    if (isCallActive) {
      message.warning('Call already in progress');
      return;
    }

    setCallState((prev) => ({ ...prev, status: 'dialing' }));
    setCallStatusMessages([]);

    try {
      const response = await pbxApi.clickToCall({
        agentExtension: user?.pbxExtension || '2001',
        customerPhone: task.phone,
        taskId: task.id,
        agentId: user?.id,
      });

      if (response.data?.success) {
        setCallState((prev) => ({
          ...prev,
          callId: response.data.callId,
        }));
        setCallStatusMessages((prev) => [
          ...prev,
          {
            time: new Date(),
            message: '📞 Call initiated. Waiting for connection...',
            type: 'info',
          },
        ]);
      } else {
        throw new Error(response.data?.message || 'Call failed to initiate');
      }
    } catch (error) {
      console.error('Click-to-Call error:', error);
      setCallState((prev) => ({
        ...prev,
        status: 'failed',
      }));
      setCallStatusMessages((prev) => [
        ...prev,
        {
          time: new Date(),
          message: `❌ Error: ${error.message}`,
          type: 'error',
        },
      ]);
      message.error(error.message || 'Failed to make call');
    }
  };

  // ============ SAVE ATTEMPT ============
  const handleSave = async (values) => {
    try {
      // Validate call was made for Click-to-Call
      if (method === 'CLICK_TO_CALL' && status === 'idle') {
        message.warning('Please make the call first before saving');
        return;
      }

      // Validate CONFIRMED requires call
      if (result === 'CONFIRMED' && status === 'idle') {
        message.warning('Please make a call before confirming');
        return;
      }

      // ✅ Build payload with all required fields
      const payload = {
        taskId: task.id,
        agentId: user?.id,
        callMethod: method,
        result: result,
        callId: callId,
        duration: callTimer || duration,
        notes: values.notes || '',
        disputeReason: values.disputeReason || null,
        noContactReason: values.noContactReason || null,
        manualReason: values.manualReason || null,
        manualReasonDetail: values.manualReasonDetail || null,
      };

      console.log('📤 Saving attempt payload:', payload);
      // ✅ Call the API
      const response = await taskApi.saveAttempt(payload);

      if (response.data) {
        message.success('Call attempt saved successfully!');

        // ✅ If result is NO_CONTACT, ask if user wants to schedule callback
        if (result === 'NO_CONTACT') {
          const shouldSchedule = await showCallbackModal();
          if (shouldSchedule) {
            // Open callback modal
            openCallbackModal(task, values);
          }
        }

        // Reset state after save
        resetCallState();
        onSave(payload);
      }
    } catch (error) {
      console.error('Error saving attempt:', error);
      message.error(error.response?.data?.error || 'Failed to save call attempt');
    }
  };

  // ============ CALLBACK MODAL ============
  const showCallbackModal = () => {
    return new Promise((resolve) => {
      Modal.confirm({
        title: 'Schedule Callback',
        content: (
          <div>
            <p>Would you like to schedule a callback for this customer?</p>
            <Form layout="vertical">
              <Form.Item label="Callback Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Callback Time">
                <TimePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Reason">
                <Input.TextArea rows={2} placeholder="Reason for callback..." />
              </Form.Item>
            </Form>
          </div>
        ),
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

  // ============ CALLBACK SECTION ============
  {
    result === 'NO_CONTACT' && (
      <Alert
        message="💡 Schedule Callback"
        description="This customer couldn't be reached. Would you like to schedule a callback?"
        type="info"
        showIcon
        action={
          <Button size="small" type="primary" onClick={() => openCallbackModal(task)}>
            Schedule
          </Button>
        }
        style={{ marginTop: 8 }}
      />
    );
  }

  // ============ RESET STATE ============
  const resetCallState = () => {
    form.resetFields();
    setCallState({
      method: 'CLICK_TO_CALL',
      result: null,
      status: 'idle',
      pbxConnected: false,
      callId: null,
      duration: 0,
      callStartTime: null,
      callEndTime: null,
      isCallActive: false,
    });
    setCallTimer(0);
    setCallStatusMessages([]);
    stopCallTimer();
  };

  // ============ HANDLE CLOSE ============
  const handleClose = () => {
    resetCallState();
    onClose();
  };

  // ============ RENDER ============
  if (!task) return null;

  const isReadOnly = task.status === 'CONFIRMED' || task.status === 'CLOSED';

  // Call status display
  const getCallStatusDisplay = () => {
    if (status === 'idle') {
      return { icon: <PhoneOutlined />, text: 'Ready to call', color: 'default' };
    }
    if (status === 'dialing') {
      return { icon: <ClockCircleOutlined spin />, text: 'Dialing...', color: 'processing' };
    }
    if (status === 'ringing') {
      return { icon: <PhoneOutlined spin />, text: 'Ringing...', color: 'processing' };
    }
    if (status === 'connected') {
      return {
        icon: <CheckCircleOutlined />,
        text: `Connected ${formatDuration(callTimer)}`,
        color: 'success',
      };
    }
    if (status === 'ended') {
      return {
        icon: <CheckCircleOutlined />,
        text: `Call ended (${formatDuration(callTimer)})`,
        color: 'default',
      };
    }
    if (status === 'failed') {
      return { icon: <ExclamationCircleOutlined />, text: 'Call failed', color: 'error' };
    }
    return { icon: <PhoneOutlined />, text: 'Unknown', color: 'default' };
  };

  const callStatusDisplay = getCallStatusDisplay();

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Loan #{task.loanId}
            <Tag color={statusColors[task.status] || 'default'} style={{ marginLeft: 8 }}>
              {task.status}
            </Tag>
          </span>
          <Button type="text" icon={<CloseOutlined />} onClick={handleClose} />
        </div>
      }
      placement="right"
      width={640}
      open={open}
      onClose={handleClose}
      closable={false}
      style={{ paddingBottom: 50 }}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '16px 24px',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            position: 'sticky',
            bottom: 0,
          }}
        >
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            disabled={!result || (method === 'CLICK_TO_CALL' && status === 'idle')}
          >
            Save & Close
          </Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            disabled={!result || (method === 'CLICK_TO_CALL' && status === 'idle')}
          >
            Save & Next ▶
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSave} disabled={isReadOnly}>
        {/* ============ PBX STATUS BANNER ============ */}
        <Alert
          message={pbxConnected ? '✅ PBX Connected' : '⚠️ PBX Disconnected'}
          description={pbxConnected ? 'Click-to-Call is available' : 'Please use Manual Dial'}
          type={pbxConnected ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* ============ CUSTOMER INFO ============ */}
        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <Title level={5}>Customer Info</Title>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Name">{task.customerName}</Descriptions.Item>
            <Descriptions.Item label="Phone">
              {task.phone}
              <Button
                type="link"
                icon={<CopyOutlined />}
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(task.phone);
                  message.success('Phone number copied!');
                }}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Loan Amount">
              ₱{task.amount?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color={task.type === 'DISBURSEMENT' ? 'blue' : 'green'}>
                {task.type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* ============ CALL ACTION ============ */}
        <Divider orientation="left">Call Action</Divider>

        <Form.Item name="callMethod" label="Dialing Method">
          <Radio.Group
            value={method}
            onChange={(e) => setCallState({ ...callState, method: e.target.value })}
            buttonStyle="solid"
            disabled={isCallActive}
          >
            <Radio.Button value="CLICK_TO_CALL">Click to Call</Radio.Button>
            <Radio.Button value="MANUAL">Manual Dial</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* ============ CALL STATUS BAR ============ */}
        <div
          style={{
            background: status === 'connected' ? '#f6ffed' : '#fafafa',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            border: `1px solid ${status === 'connected' ? '#b7eb8f' : '#e8e8e8'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Badge
              status={
                status === 'connected' ? 'success' : status === 'idle' ? 'default' : 'processing'
              }
              text={
                <span style={{ fontWeight: 500 }}>
                  {callStatusDisplay.icon} {callStatusDisplay.text}
                </span>
              }
            />
          </div>
        </div>

        {/* ============ CLICK TO CALL BUTTON ============ */}
        {method === 'CLICK_TO_CALL' && (
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PhoneOutlined />}
              size="large"
              block
              onClick={executeClickToCall}
              disabled={
                isCallActive ||
                status === 'ended' ||
                status === 'failed' ||
                !pbxConnected ||
                isReadOnly
              }
              loading={status === 'dialing' || status === 'ringing'}
              style={{
                background: status === 'connected' ? '#52c41a' : undefined,
                borderColor: status === 'connected' ? '#52c41a' : undefined,
              }}
            >
              {status === 'idle' && '📞 CALL NOW'}
              {status === 'dialing' && '📞 Dialing...'}
              {status === 'ringing' && '🔔 Ringing...'}
              {status === 'connected' && `🟢 Connected ${formatDuration(callTimer)}`}
              {status === 'ended' && '⏹️ Call Ended'}
              {status === 'failed' && '❌ Call Failed - Retry'}
            </Button>

            {/* Call status messages */}
            {callStatusMessages.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 80, overflow: 'auto' }}>
                {callStatusMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 12,
                      color:
                        msg.type === 'error'
                          ? '#ff4d4f'
                          : msg.type === 'success'
                            ? '#52c41a'
                            : '#666',
                      padding: '2px 0',
                      borderBottom:
                        idx < callStatusMessages.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    {msg.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ MANUAL DIAL REASON ============ */}
        {method === 'MANUAL' && (
          <>
            <Form.Item
              name="manualReason"
              label="Reason for manual dial"
              rules={[{ required: true, message: 'Please select a reason' }]}
            >
              <Select placeholder="Select reason">
                <Select.Option value="EXT_BUSY">Extension Busy</Select.Option>
                <Select.Option value="PERSONAL_MOBILE">Personal Mobile Used</Select.Option>
                <Select.Option value="OTHER">Other</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.manualReason !== curr.manualReason}
            >
              {({ getFieldValue }) =>
                getFieldValue('manualReason') === 'OTHER' && (
                  <Form.Item
                    name="manualReasonDetail"
                    label="Detail Reason"
                    rules={[{ required: true, message: 'Please provide details' }]}
                  >
                    <Input placeholder="Enter detailed reason..." />
                  </Form.Item>
                )
              }
            </Form.Item>
          </>
        )}

        {/* ============ VERIFICATION RESULT ============ */}
        <Divider orientation="left">Verification Result</Divider>

        <Form.Item
          name="result"
          label="Call Result *"
          rules={[{ required: true, message: 'Please select the call result' }]}
        >
          <Radio.Group
            onChange={(e) => setCallState({ ...callState, result: e.target.value })}
            value={result}
          >
            <Space direction="vertical">
              <Radio value="CONFIRMED">✅ Confirmed</Radio>
              <Radio value="DISPUTED">⚠️ Disputed</Radio>
              <Radio value="NO_CONTACT">❌ No Contact</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* ============ DISPUTE REASON ============ */}
        {result === 'DISPUTED' && (
          <Form.Item
            name="disputeReason"
            label="Dispute Reason"
            rules={[{ required: true, message: 'Please select dispute reason' }]}
          >
            <Select placeholder="Select dispute reason">
              <Select.Option value="AMOUNT_MISMATCH">Amount Mismatch</Select.Option>
              <Select.Option value="NOT_RECEIVED">Not Received</Select.Option>
              <Select.Option value="OTHER">Other</Select.Option>
            </Select>
          </Form.Item>
        )}

        {/* ============ NO CONTACT REASON ============ */}
        {result === 'NO_CONTACT' && (
          <Form.Item
            name="noContactReason"
            label="No Contact Reason"
            rules={[{ required: true, message: 'Please select no contact reason' }]}
          >
            <Select placeholder="Select no contact reason">
              <Select.Option value="NO_ANSWER">No Answer</Select.Option>
              <Select.Option value="BUSY">Busy</Select.Option>
              <Select.Option value="WRONG_NUMBER">Wrong Number</Select.Option>
              <Select.Option value="SWITCHED_OFF">Switched Off</Select.Option>
            </Select>
          </Form.Item>
        )}

        {/* ============ NOTES ============ */}
        <Form.Item name="notes" label="Notes">
          <TextArea rows={4} placeholder="Add any additional notes..." />
        </Form.Item>

        {/* ============ ATTEMPT HISTORY ============ */}
        <Divider orientation="left">Attempt History</Divider>
        <div style={{ background: '#fafafa', padding: 12, borderRadius: 8 }}>
          {task.attempts > 0 ? (
            <Text type="secondary">{task.attempts} previous attempts made</Text>
          ) : (
            <Text type="secondary">No previous attempts</Text>
          )}
        </div>
      </Form>
    </Drawer>
  );
};

export default CallExecutionDrawer;
