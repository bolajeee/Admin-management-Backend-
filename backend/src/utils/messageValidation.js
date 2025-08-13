class MessageValidation {
    static validateNewMessage(data) {
        const errors = [];
        const { content, receiver } = data;

        if (!content || content.trim().length === 0) {
            errors.push('Message content is required');
        } else if (content.length > 5000) {
            errors.push('Message content cannot exceed 5000 characters');
        }

        if (!receiver) {
            errors.push('Receiver ID is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validateMessageUpdate(data) {
        const errors = [];
        const { messageId, status } = data;

        if (!messageId) {
            errors.push('Message ID is required');
        }

        if (status && !['sent', 'delivered', 'read'].includes(status)) {
            errors.push('Invalid message status');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validateMessageSearch(data) {
        const errors = [];
        const { searchTerm } = data;

        if (!searchTerm || searchTerm.trim().length === 0) {
            errors.push('Search term is required');
        } else if (searchTerm.length < 2) {
            errors.push('Search term must be at least 2 characters long');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export { MessageValidation };
