
import { PString } from './p-string'

export class PValue extends PString {
    constructor() {
        super(['"', '`'])
        this.options.startsWith = {
            token: ['="', '=\''],
            omit: true,
        }
        this.options.onMatch = ({ matched, customData }) => customData.quote = matched[0][1]
    }
}
