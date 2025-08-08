@echo off
setlocal enabledelayedexpansion

REM MongoDB可视化工具 - Windows Docker部署脚本
REM 使用方法: deploy.bat [start|stop|restart|logs|clean]

set PROJECT_NAME=mongo_view

REM 检查Docker是否安装
:check_docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker未安装，请先安装Docker Desktop
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker Compose未安装，请先安装Docker Compose
    pause
    exit /b 1
)

REM 获取命令参数
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=help

REM 执行对应命令
if "%COMMAND%"=="start" goto start_services
if "%COMMAND%"=="stop" goto stop_services
if "%COMMAND%"=="restart" goto restart_services
if "%COMMAND%"=="logs" goto show_logs
if "%COMMAND%"=="clean" goto clean_resources
if "%COMMAND%"=="help" goto show_help

echo [错误] 未知命令: %COMMAND%
goto show_help

REM 启动服务
:start_services
echo [信息] 正在启动MongoDB可视化工具...

REM 构建并启动服务
docker-compose up -d --build
if errorlevel 1 (
    echo [错误] 服务启动失败
    pause
    exit /b 1
)

echo [信息] 等待服务启动...
timeout /t 10 /nobreak >nul

REM 检查服务状态
docker-compose ps | findstr "Up" >nul
if errorlevel 1 (
    echo [错误] 服务启动失败，请检查日志
    docker-compose logs
    pause
    exit /b 1
) else (
    echo [成功] 服务启动成功！
    echo [信息] 前端访问地址: http://localhost:3000
    echo [信息] 后端API地址: http://localhost:3001
    echo [信息] MongoDB地址: mongodb://localhost:27017
)
goto end

REM 停止服务
:stop_services
echo [信息] 正在停止服务...
docker-compose down
echo [成功] 服务已停止
goto end

REM 重启服务
:restart_services
echo [信息] 正在重启服务...
call :stop_services
call :start_services
goto end

REM 查看日志
:show_logs
echo [信息] 显示服务日志...
docker-compose logs -f
goto end

REM 清理资源
:clean_resources
echo [信息] 正在清理Docker资源...

REM 停止并删除容器
docker-compose down -v

REM 删除镜像
for /f "tokens=3" %%i in ('docker images ^| findstr "%PROJECT_NAME%"') do (
    docker rmi %%i 2>nul
)

REM 清理未使用的资源
docker system prune -f

echo [成功] 清理完成
goto end

REM 显示帮助信息
:show_help
echo MongoDB可视化工具 - Windows Docker部署脚本
echo.
echo 使用方法:
echo   deploy.bat start    - 启动所有服务
echo   deploy.bat stop     - 停止所有服务
echo   deploy.bat restart  - 重启所有服务
echo   deploy.bat logs     - 查看服务日志
echo   deploy.bat clean    - 清理所有Docker资源
echo   deploy.bat help     - 显示此帮助信息
echo.
echo 服务地址:
echo   前端: http://localhost:3000
echo   后端: http://localhost:3001
echo   MongoDB: mongodb://localhost:27017
echo.
goto end

:end
if "%COMMAND%"=="help" pause
exit /b 0