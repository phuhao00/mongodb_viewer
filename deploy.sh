#!/bin/bash

# MongoDB可视化工具 - Docker部署脚本
# 使用方法: ./deploy.sh [start|stop|restart|logs|clean]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目名称
PROJECT_NAME="mongo_view"

# 打印带颜色的消息
print_message() {
    echo -e "${2}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_message "Docker未安装，请先安装Docker" "$RED"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_message "Docker Compose未安装，请先安装Docker Compose" "$RED"
        exit 1
    fi
}

# 启动服务
start_services() {
    print_message "正在启动MongoDB可视化工具..." "$BLUE"
    
    # 构建并启动服务
    docker-compose up -d --build
    
    print_message "等待服务启动..." "$YELLOW"
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        print_message "服务启动成功！" "$GREEN"
        print_message "前端访问地址: http://localhost:3000" "$GREEN"
        print_message "后端API地址: http://localhost:3001" "$GREEN"
        print_message "MongoDB地址: mongodb://localhost:27017" "$GREEN"
    else
        print_message "服务启动失败，请检查日志" "$RED"
        docker-compose logs
        exit 1
    fi
}

# 停止服务
stop_services() {
    print_message "正在停止服务..." "$YELLOW"
    docker-compose down
    print_message "服务已停止" "$GREEN"
}

# 重启服务
restart_services() {
    print_message "正在重启服务..." "$YELLOW"
    stop_services
    start_services
}

# 查看日志
show_logs() {
    print_message "显示服务日志..." "$BLUE"
    docker-compose logs -f
}

# 清理资源
clean_resources() {
    print_message "正在清理Docker资源..." "$YELLOW"
    
    # 停止并删除容器
    docker-compose down -v
    
    # 删除镜像
    docker images | grep "$PROJECT_NAME" | awk '{print $3}' | xargs -r docker rmi
    
    # 清理未使用的资源
    docker system prune -f
    
    print_message "清理完成" "$GREEN"
}

# 显示帮助信息
show_help() {
    echo "MongoDB可视化工具 - Docker部署脚本"
    echo ""
    echo "使用方法:"
    echo "  ./deploy.sh start    - 启动所有服务"
    echo "  ./deploy.sh stop     - 停止所有服务"
    echo "  ./deploy.sh restart  - 重启所有服务"
    echo "  ./deploy.sh logs     - 查看服务日志"
    echo "  ./deploy.sh clean    - 清理所有Docker资源"
    echo "  ./deploy.sh help     - 显示此帮助信息"
    echo ""
    echo "服务地址:"
    echo "  前端: http://localhost:3000"
    echo "  后端: http://localhost:3001"
    echo "  MongoDB: mongodb://localhost:27017"
}

# 主函数
main() {
    check_docker
    
    case "${1:-help}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs
            ;;
        clean)
            clean_resources
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_message "未知命令: $1" "$RED"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"