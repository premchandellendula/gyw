import Link from "next/link"

interface IBottomWarning {
    label: string,
    buttonText: string,
    to: string
}

export default function BottomWarning(props: IBottomWarning){
    return (
        <div className='flex justify-center pt-2 text-[0.8rem] md:text-[0.95rem]'>
            <div className='text-gray-600 dark:text-gray-500'>
                {props.label}
            </div>
            <Link href={props.to} className='pointer underline pl-1 cursor-pointer text-[0.8rem] md:text-[0.95rem] text-gray-800 dark:text-gray-300'>{props.buttonText}</Link>
        </div>
    )
}