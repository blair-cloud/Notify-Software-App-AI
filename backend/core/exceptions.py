from fastapi import HTTPException, status


class NotifyException(HTTPException):
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)


class UnauthorizedException(NotifyException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(NotifyException):
    def __init__(self, detail: str = "Access denied: insufficient permissions or isolation boundary violated"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundException(NotifyException):
    def __init__(self, detail: str = "Requested resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ConflictException(NotifyException):
    def __init__(self, detail: str = "Resource conflict or unique constraint violation"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)
