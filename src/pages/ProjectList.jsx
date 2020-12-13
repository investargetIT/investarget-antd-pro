import React from 'react'
import { connect } from 'dva'
import { Link, withRouter } from 'dva/router';
import { 
  i18n, 
  hasPerm, 
  formatMoney, 
  isShowCNY, 
} from '../utils/util';
import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Input,
  Icon,
  Table,
  Button,
  Pagination,
  Popconfirm,
  Modal,
  Progress,
  Divider,
  Dropdown,
  Menu,
} from 'antd';
// import LeftRightLayout from '../components/LeftRightLayout'

import { ProjectListFilter } from '../components/Filter'
// import { Search } from '../components/Search';

// import AuditProjectModal from '../components/AuditProjectModal'
import { PAGE_SIZE_OPTIONS } from '../constants';
import { ApiError } from '../utils/request';

class ProjectList extends React.Component {
  constructor(props) {
    super(props)

    // const { page } = props.location.query;

    const setting = this.readSetting()
    const filters = setting ? setting.filters : ProjectListFilter.defaultValue
    const search = setting ? setting.search : null
    const page = setting && setting.page ? setting.page : 1
    const pageSize = setting && setting.pageSize ? setting.pageSize: props.userPageSize;

    this.state = {
      filters,
      search,
      page,
      pageSize,
      total: 0,
      list: [],
      loading: false,

      visible: false,
      id: null,
      currentStatus: null,
      status: null,
      sendEmail: false,
      confirmLoading: false,
      sendWechat: false,
      discloseFinance: false,
    }
  }

  handleFilt = (filters) => {
    this.setState({ filters, page: 1 }, this.getProject)
  }

  handleReset = (filters) => {
    this.setState({ filters, page: 1, search: null }, this.getProject)
  }

  handleSearch = (search) => {
    this.setState({ search, page: 1 }, this.getProject)
  }

  handlePageChange = (page) => {
    // this.props.router.push(`/app/projects/list?page=${page}`);
    this.setState({ page }, this.getProject)
  }

  handlePageSizeChange = (current, pageSize) => {
    this.setState({ pageSize, page: 1 }, this.getProject)
  }

  // 特殊处理
  handleFinancialFilter = (filters) => {
    var data = { ...filters }
    if (data['netIncome_USD_F'] == ProjectListFilter.defaultValue['netIncome_USD_F'] &&
        data['netIncome_USD_T'] == ProjectListFilter.defaultValue['netIncome_USD_T'] )
    {
      delete data['netIncome_USD_F']
      delete data['netIncome_USD_T']
    }
    if (data['grossProfit_F'] == ProjectListFilter.defaultValue['grossProfit_F'] &&
        data['grossProfit_T'] == ProjectListFilter.defaultValue['grossProfit_T'] )
    {
      delete data['grossProfit_F']
      delete data['grossProfit_T']
    }
    return data
  }

  getProject = () => {
    const { filters, search, page, pageSize } = this.state
    const params = { ...this.handleFinancialFilter(filters), search, skip_count: (page-1)*pageSize, max_size: pageSize }
    this.setState({ loading: true })
    api.getProj(params).then(result => {
      const { count: total, data: list } = result.data
      this.setState({ total, list, loading: false })
    }, error => {
      this.setState({ loading: false })
      this.props.dispatch({
        type: 'app/findError',
        payload: error
      })
    })
    this.writeSetting()
  }

  handleDelete = (id) => {
    this.setState({ loading: true })
    api.deleteProj(id).then(result => {
      this.getProject()
    }, error => {
      this.setState({ loading: false })
      this.props.dispatch({
        type: 'app/findError',
        payload: error
      })
    })
  }

  // audit project modal

  openAuditProjectModal = (id, status) => {
    this.setState({ visible: true, id, currentStatus: status, status, sendEmail: false, sendWechat: false, discloseFinance: false })
  }

  handleStatusChange = (status) => {
    this.setState({ status })
  }

  handleDiscloseFinanceChange = (discloseFinance) => {
    this.setState({ discloseFinance });
  }

  handleSendEmailChange = (sendEmail) => {
    this.setState({ sendEmail })
  }

  handleSendWechatChange = sendWechat => {
    this.setState({ sendWechat });
  }

  handleConfirmAudit = () => {
    const { id, status, sendEmail, sendWechat, discloseFinance } = this.state
    this.setState({ confirmLoading: true })
    api.editProj(id, { projstatus: status, isSendEmail: sendEmail, financeIsPublic: discloseFinance })
      .then(result => {
        this.setState({ visible: false, confirmLoading: false })
        this.getProject()
        if (sendWechat) {
          api.sendProjPdfToWechatGroup(id);
        }
      })
      .catch(error => {
        this.setState({ visible: false, confirmLoading: false })
        this.props.dispatch({
          type: 'app/findError',
          payload: error,
        })
      })
  }

  handleCancelAudit = () => {
    this.setState({ visible: false })
  }



  writeSetting = () => {
    const { filters, search, page, pageSize } = this.state
    const data = { filters, search, page };
    localStorage.setItem('ProjectList', JSON.stringify(data))
  }

  readSetting = () => {
    var data = localStorage.getItem('ProjectList')
    return data ? JSON.parse(data) : null
  }

  componentDidMount() {
    this.props.dispatch({ type: 'app/getSourceList', payload: ['projstatus'] });
    this.getProject()
  }

  // componentWillReceiveProps(nextProps) {
  //   const { page: nextPage } = nextProps.location.query;
  //   const { page: currentPage } = this.props.location.query;
  //   if (nextPage !== currentPage) {
  //     this.setState({ page: parseInt(nextPage, 10) || 1 }, this.getProject);
  //   }
  // }

  handleDeleteBtnClick = projectID => {
    Modal.confirm({
      title: '删除项目',
      content: '确定删除该项目吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => this.handleDelete(projectID),
    });
  }

  render() {
    const { location } = this.props
    const { total, list, loading, page, pageSize, filters, search, visible, currentStatus, status, sendEmail, confirmLoading, sendWechat, discloseFinance } = this.state
    const buttonStyle={textDecoration:'underline',border:'none',background:'none',textAlign:'left',padding: 0,width: '100%'}
    const imgStyle={width:'15px',height:'20px'}
    const columns = [
      {
        title: i18n('project.image'),
        key: 'image',
        render: (text, record) => {
          const industry = record.industries && record.industries[0]
          const imgUrl = industry ? industry.url : 'defaultUrl'
          return (
            <img src={imgUrl} style={{width: '80px', height: '50px'}} />
          )
        }
      },
      {
        title: i18n('project.name'),
        key: 'title',
        render: (text, record) => {
          if (record.action.get) {
            return (
              <span style={{  display: 'inline-block', maxWidth: 200 }}>
                <Link to={'/app/projects/' + record.id}>{record.projtitle}</Link>
              </span>
            )
          } else {
            this.props.dispatch({
              type: 'app/findError',
              payload: new ApiError(3000),
            });
          }
        }
      },
      {
        title: i18n('project.country'),
        key: 'country',
        align: 'center',
        render: (text, record) => {
          const country = record.country
          const countryName = country ? country.country : ''
          let imgUrl = country && country.key && country.url
          if (country && !imgUrl) {
            const parentCountry = this.props.country.filter(f => f.id === country.parent)[0]
            if (parentCountry && parentCountry.url) {
              imgUrl = parentCountry.url
            }
          }
          return (
            <div style={{ minWidth: 60 }}>
              { imgUrl ? <div><img src={imgUrl} style={{ width: '20px', height: '14px' }} /></div> : null }
              <div>{countryName}</div>
            </div>
          )
        }
      },
      {
        title: i18n('project.transaction_size'),
        key: 'transactionAmount',
        render: (text, record) => {
          if (isShowCNY(record, this.props.country)) {
            return record.financeAmount ? formatMoney(record.financeAmount, 'CNY') : 'N/A'
          } else {
            return record.financeAmount_USD ? formatMoney(record.financeAmount_USD) : 'N/A'
          }
        }       
      },
      {
        title: i18n('project.current_status'),
        key: 'projstatus',
        render: (text, record) => {
          const status = record.projstatus
          const statusName = status ? status.name : ''
          return statusName
        }
      },
      {
        title: '项目进度',
        key: 'progress',
        render: (text, record) => {
          const status = record.projstatus;
          const statusID = status ? status.id : 0;
          return (
            <Progress
              percent={Math.round(statusID / 8 * 100)}
              // status={status}
              strokeWidth={6}
              style={{
                width: 180,
              }}
            />
          );
        }
      },
    ]
    if (hasPerm('usersys.as_admin')) {
      columns.push({
        title: i18n('project.is_hidden'),
        key: 'isHidden',
        render: (text, record) => {
          return record.isHidden ? i18n('project.invisible') : i18n('project.visible')
        }
      })
    }
    columns.push({
      title: i18n('common.operation'),
      key: 'action',
      render: (_, record) => {
        return (
          <>
            <Link to={'/app/projects/edit/' + record.id}>
              <Button style={{ ...buttonStyle, padding: 0, width: 'auto', color: '#1890ff' }} disabled={!record.action.change}>{i18n("common.edit")}</Button>
            </Link>
            <Divider type="vertical" />
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="modify_status">
                    <Button style={buttonStyle} disabled={!hasPerm('proj.admin_changeproj')} onClick={this.openAuditProjectModal.bind(this, record.id, record.projstatus.id)}>{i18n('project.modify_status')}</Button>
                  </Menu.Item>
                  <Menu.Item key="recommend">
                    <a href={"/app/projects/recommend/" + record.id} target="_blank">
                      <Button style={buttonStyle} disabled={!(record.projstatus.id >= 4 && record.projstatus.id < 8) || !(hasPerm('proj.admin_addfavorite') || hasPerm('usersys.as_trader'))}>{i18n('project.recommend')}</Button>
                    </a>
                  </Menu.Item>
                  {record.action.canAddOrgBD &&
                    <Menu.Item key="create_org_bd">
                      <Link to={"/app/orgbd/add?projId=" + record.id}>
                        <Button style={buttonStyle} disabled={!(record.projstatus.id >= 4 && record.projstatus.id < 8)}>{i18n('project.create_org_bd')}</Button>
                      </Link>
                    </Menu.Item>
                  }
                  {record.action.canAddMeetBD &&
                    <Menu.Item key="create_meeting_bd">
                      <Link to={"/app/meetingbd/add?projId=" + record.id}>
                        <Button style={buttonStyle} disabled={!(record.projstatus.id >= 4 && record.projstatus.id < 8)}>{i18n('project.create_meeting_bd')}</Button>
                      </Link>
                    </Menu.Item>
                  }
                  <Menu.Item key="create_dataroom">
                    <Link to={'/app/dataroom/add?projectID=' + record.id}>
                      <Button style={buttonStyle} disabled={!record.action.canAddDataroom}>{i18n('project.create_dataroom')}</Button>
                    </Link>
                  </Menu.Item>
                  {(record.projstatus.id >= 4 && record.projstatus.id < 8 && (hasPerm('BD.manageOrgBD') || hasPerm('BD.user_getOrgBD'))) &&
                    <Menu.Item key="view_org_bd">
                      <Link to={'/app/org/bd?projId=' + record.id}>
                        <Button style={buttonStyle}>查看机构BD</Button>
                      </Link>
                    </Menu.Item>
                  }
                  <Menu.Item key="delete" danger>
                    <Button size="small" style={buttonStyle} disabled={!record.action.delete} onClick={() => this.handleDeleteBtnClick(record.id)}>删除</Button>
                  </Menu.Item>
                </Menu>
              }
            >
              <a>
                更多 <DownOutlined />
              </a>
            </Dropdown>
          </>
        );
      }
    });
    const action = (hasPerm('proj.admin_addproj') || hasPerm('proj.user_addproj')) ?
                    { name: i18n('project.upload_project'), link: "/app/projects/add" } : null

    return (
      // <LeftRightLayout location={location} title={i18n('project.platform_projects')} action={action}>
<div>
        {/* <ProjectListFilter defaultValue={filters} onSearch={this.handleFilt} onReset={this.handleReset} /> */}

        {/* <div style={{ marginBottom: 20, textAlign: 'right' }} className="clearfix">
          <Search
            style={{ width: 200 }}
            placeholder={i18n('project.project_name')}
            onSearch={this.handleSearch}
            onChange={search => this.setState({ search })}
            value={search}
          />
        </div> */}

        {(hasPerm('proj.admin_addproj') || hasPerm('proj.user_addproj')) &&
          <Link to="/app/projects/add">
            <Button
              type="dashed"
              style={{
                width: '100%',
                marginBottom: 8,
              }}
            >
              <PlusOutlined />
              新增项目
            </Button>
          </Link>
        }

        <Table
          columns={columns}
          dataSource={list}
          rowKey={record=>record.id}
          loading={loading}
          pagination={false}
        />

        <div style={{ margin: '16px 0' }} className="clearfix">
          <Pagination
            size="large"
            style={{ float: 'right' }}
            total={total}
            current={page}
            pageSize={pageSize}
            onChange={this.handlePageChange}
            showSizeChanger
            onShowSizeChange={this.handlePageSizeChange}
            showQuickJumper
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        </div>

        {/* <AuditProjectModal
          projId={this.state.id}
          visible={visible}
          currentStatus={currentStatus}
          status={status}
          sendEmail={sendEmail}
          confirmLoading={confirmLoading}
          onStatusChange={this.handleStatusChange}
          onSendEmailChange={this.handleSendEmailChange}
          onOk={this.handleConfirmAudit}
          onCancel={this.handleCancelAudit}
          sendWechat={sendWechat}
          onSendWechatChange={this.handleSendWechatChange}
          discloseFinance={discloseFinance}
          onDiscloseFinanceChange={this.handleDiscloseFinanceChange}
        /> */}

      {/* // </LeftRightLayout> */}
      </div>
    )
  }
}

function mapStateToProps(state) {
  const { country, projstatus } = state.app;
  const { page: userPageSize } = state.currentUser;
  return { country, userPageSize };
}


export default connect(mapStateToProps)(withRouter(ProjectList));
